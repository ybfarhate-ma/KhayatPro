import { getAccessToken } from './auth';
import { dbConn, getSQLiteConnection } from './sqlite';
import { Capacitor } from '@capacitor/core';
import { formatDate } from './utils';

let isUploading = false;

async function generateSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const backupToDrive = async (): Promise<{ success: boolean; message?: string }> => {
  if (isUploading) return { success: false, message: 'جارٍ رفع نسخة احتياطية حالياً...' };
  
  const token = getAccessToken();
  if (!token) return { success: false, message: 'يرجى تسجيل الدخول بحساب جوجل أولاً' };

  if (token === 'mock_token_for_web_testing_123') {
     console.warn('Mock token detected. Pretending to backup successfully for test purposes.');
     await new Promise(res => setTimeout(res, 500));
     isUploading = false;
     return { success: true, message: 'تم حفظ النسخة الافتراضية للويب' };
  }

  isUploading = true;
  try {
    if (!dbConn) throw new Error('Database connection not established.');

    // Step 1: Export DB structure directly using Capacitor SQLite Export
    const exportResult = await dbConn.exportToJson('full');
    const dbRawOutput = JSON.stringify(exportResult.export); // We must serialize the SQLite export dump
    
    // Step 2: Generate checksum
    const checksum = await generateSHA256(dbRawOutput);
    
    // Step 3: Determine dynamic names using the current date in standard DD-MM-YYYY format
    const today = new Date();
    const dateStr = formatDate(today).replace(/\//g, '-'); // Format date as DD-MM-YYYY
    const backupFilename = `Tailor Pro Backup ${dateStr}.sqlite`;
    const manifestFilename = `Tailor Pro Manifest ${dateStr}.json`;

    // Step 4: Create manifest
    const manifest = {
      appVersion: "1.0.0",
      dbVersion: 1,
      createdAt: Math.floor(Date.now() / 1000),
      checksum: checksum,
      platform: Capacitor.getPlatform(),
      date: formatDate(today)
    };
    const manifestStr = JSON.stringify(manifest);

    // Prepare multipart form upload for raw data
    const prepareUpload = async (filename: string, content: string, mimeType: string) => {
      // Find existing file with the exact filename to overwrite it if done on the same day
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${filename}' and trashed=false&spaces=appDataFolder&fields=files(id)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!searchRes.ok) throw new Error('Network permission denied for AppData');
      const searchData = await searchRes.json();
      const existingId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;

      const blob = new Blob([content], { type: mimeType });

      if (existingId) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': mimeType },
          body: blob
        });
      } else {
        const metadata = { name: filename, parents: ['appDataFolder'] };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);
        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        });
      }
    };

    // Upload backup file and manifest
    await prepareUpload(backupFilename, dbRawOutput, 'application/octet-stream');
    await prepareUpload(manifestFilename, manifestStr, 'application/json');

    // Step 5: Clean up older copies (Keeps only latest 2 backups: currently uploaded + previous run)
    try {
      // Find all backups matching the pattern of SQLite files
      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name contains 'Tailor Pro Backup ' and name contains '.sqlite' and trashed=false&spaces=appDataFolder&fields=files(id, name, createdTime)`, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (listRes.ok) {
        const listData = await listRes.json();
        const files = listData.files || [];
        
        // Robust local sorting of files descending (newest first)
        files.sort((a: any, b: any) => {
          const timeA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
          const timeB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
          return timeB - timeA;
        });

        // Retention policy: Keep only top 2 copies (newest index 0 and 1). Delete index >= 2
        if (files.length > 2) {
          const obsoleteFiles = files.slice(2);
          for (const obsFile of obsoleteFiles) {
            // Delete SQLite file
            await fetch(`https://www.googleapis.com/drive/v3/files/${obsFile.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });

            // Parse date from file name to find and delete matching Manifest
            const datePart = obsFile.name.replace('Tailor Pro Backup ', '').replace('.sqlite', '');
            const matchingManifestName = `Tailor Pro Manifest ${datePart}.json`;

            const manifestSearchRes = await fetch(
              `https://www.googleapis.com/drive/v3/files?q=name='${matchingManifestName}' and trashed=false&spaces=appDataFolder&fields=files(id)`, 
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );

            if (manifestSearchRes.ok) {
              const manifestSearchData = await manifestSearchRes.json();
              const obsManifestId = manifestSearchData.files && manifestSearchData.files.length > 0 ? manifestSearchData.files[0].id : null;
              if (obsManifestId) {
                await fetch(`https://www.googleapis.com/drive/v3/files/${obsManifestId}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` }
                });
              }
            }
          }
        }
      }
    } catch (cleanupErr) {
      console.warn('Non-fatal error cleaning up older backups:', cleanupErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Drive Backup Engine Error:', error);
    return { success: false, message: error.message };
  } finally {
    isUploading = false;
  }
};

export const restoreFromDrive = async (): Promise<{ success: boolean; message?: string }> => {
  const token = getAccessToken();
  if (!token) return { success: false, message: 'يرجى تسجيل الدخول بحساب جوجل أولاً' };

  if (token === 'mock_token_for_web_testing_123') {
     console.warn('Mock token detected. Pretending to restore successfully for test purposes.');
     await new Promise(res => setTimeout(res, 500));
     return { success: true, message: 'تم استعادة النسخة الافتراضية بنجاح' };
  }

  try {
    // Search for all backup SQLite files in AppDataFolder
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name contains 'Tailor Pro Backup ' and name contains '.sqlite' and trashed=false&spaces=appDataFolder&fields=files(id, name, createdTime)`, 
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    if (!searchRes.ok) throw new Error('تعذر الاتصال بجوجل درايف');
    const searchData = await searchRes.json();
    const files = searchData.files || [];

    if (files.length === 0) {
      return { success: false, message: 'لم يتم العثور على أي نسخة احتياطية صالحة' };
    }

    // Sort descending to get the most recent backup
    files.sort((a: any, b: any) => {
      const timeA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
      const timeB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
      return timeB - timeA;
    });

    const newestFile = files[0];
    const datePart = newestFile.name.replace('Tailor Pro Backup ', '').replace('.sqlite', '');
    const matchingManifestName = `Tailor Pro Manifest ${datePart}.json`;

    // Download the sqlite backup file
    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${newestFile.id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!downloadRes.ok) throw new Error('فشل تحميل ملف النسخة الاحتياطية');
    const dbDump = await downloadRes.text();

    // Find and download matching Manifest
    const manifestSearchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${matchingManifestName}' and trashed=false&spaces=appDataFolder&fields=files(id)`, 
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    if (!manifestSearchRes.ok) throw new Error('فشل البحث عن ملف تعريف النسخة الاحتياطية (Manifest)');
    
    let manifestStr = '';
    const manifestSearchResult = await manifestSearchRes.json();
    const manifestId = manifestSearchResult.files && manifestSearchResult.files.length > 0 ? manifestSearchResult.files[0].id : null;
    
    if (manifestId) {
      const manifestDlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${manifestId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (manifestDlRes.ok) {
        manifestStr = await manifestDlRes.text();
      }
    }

    if (!manifestStr || !dbDump) {
      return { success: false, message: 'النسخة الاحتياطية تالفة أو غير مكتملة المواصفات' };
    }

    const manifest = JSON.parse(manifestStr);
    const checksum = await generateSHA256(dbDump);
    
    if (manifest.checksum !== checksum) {
      return { success: false, message: 'النسخة الاحتياطية تالفة أو غير مكتملة (Checksum mismatch)' };
    }

    if (dbDump) {
       await getSQLiteConnection().importFromJson(JSON.parse(dbDump));
       window.location.reload(); // Hard reload after restore to reset caches
    }

    return { success: true };
  } catch (error: any) {
    console.error('Drive Restore Engine Error:', error);
    return { success: false, message: error.message };
  }
};
