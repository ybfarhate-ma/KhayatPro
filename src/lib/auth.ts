export interface AppAuthUser {
  uid: string;
  isAnonymous: boolean;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerId: string;
}

export type AppUser = AppAuthUser;
export type User = AppAuthUser;

// Initialize Capacitor platform check
const capacitor = typeof window !== 'undefined' ? (window as any).Capacitor : null;
export const isNative = capacitor?.isNativePlatform;

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let currentUser: AppAuthUser | null = null;

// Initialize GoogleAuth dynamic loader for native platforms
if (typeof window !== 'undefined' && isNative) {
  import('@codetrix-studio/capacitor-google-auth')
    .then(({ GoogleAuth }) => {
      try {
        GoogleAuth.initialize();
      } catch (e) {
        console.error('Failed to initialize GoogleAuth native plugin:', e);
      }
    })
    .catch(err => {
      console.error('Failed to dynamically load GoogleAuth:', err);
    });
}

export const initAuth = (
  onAuthSuccess?: (user: AppUser, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  // Check session in localStorage
  const savedUser = localStorage.getItem('khayatpro_user');
  const savedToken = localStorage.getItem('khayatpro_token');

  if (savedUser && savedToken) {
    currentUser = JSON.parse(savedUser);
    cachedAccessToken = savedToken;
    if (onAuthSuccess) onAuthSuccess(currentUser!, cachedAccessToken);
  } else {
    // Check for local account fallback
    const localUid = localStorage.getItem('khayatpro_local_account_uid');
    if (localUid) {
      currentUser = {
        uid: localUid,
        isAnonymous: true,
        displayName: 'مستخدم محلي',
        email: null,
        photoURL: null,
        providerId: 'local'
      };
      if (onAuthSuccess) onAuthSuccess(currentUser!, null);
    } else if (onAuthFailure) {
      onAuthFailure();
    }
  }

  return () => {};
};

export const guestSignIn = async (): Promise<{ user: AppUser; accessToken: null } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const uid = localStorage.getItem('khayatpro_local_account_uid') || ('local-' + Math.random().toString(36).substring(2, 9));
    localStorage.setItem('khayatpro_local_account_uid', uid);
    
    currentUser = {
      uid,
      isAnonymous: true,
      displayName: 'مستخدم محلي',
      email: null,
      photoURL: null,
      providerId: 'local'
    };
    
    cachedAccessToken = null;
    return { user: currentUser, accessToken: null };
  } finally {
    isSigningIn = false;
  }
};

export const googleSignIn = async (webEmail?: string, webName?: string): Promise<{ user: AppUser; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    
    // Fallback for Web/Testing environments where we are not running as a native app
    if (!isNative) {
       console.warn('GoogleAuth native plugin is not available on web. Using secure web simulation.');
       cachedAccessToken = 'mock_token_for_web_testing_123';
       
       const email = webEmail || localStorage.getItem('khayatpro_web_mock_email') || 'user@example.com';
       const displayName = webName || localStorage.getItem('khayatpro_web_mock_name') || 'مستخدم جوجل (Web)';
       const uid = 'google_web_mock_' + email.replace(/[^a-zA-Z0-9]/g, '_');
       
       currentUser = {
         uid,
         isAnonymous: false,
         displayName,
         email,
         photoURL: null,
         providerId: 'google.com'
       };
       localStorage.setItem('khayatpro_user', JSON.stringify(currentUser));
       localStorage.setItem('khayatpro_token', cachedAccessToken);
       localStorage.removeItem('khayatpro_local_account_uid');
       
       // Save to web mock cache for auto-login
       localStorage.setItem('khayatpro_web_mock_email', email);
       localStorage.setItem('khayatpro_web_mock_name', displayName);
       
       return { user: currentUser, accessToken: cachedAccessToken };
    }

    // Explicitly import and use @codetrix-studio/capacitor-google-auth native sign-in
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    const googleUser = await GoogleAuth.signIn() as any;
    
    if (!googleUser.authentication || (!googleUser.authentication.idToken && !googleUser.authentication.accessToken)) {
      throw new Error('فشل الحصول على بيانات الاعتماد من جوجل');
    }

    cachedAccessToken = googleUser.authentication.accessToken;
    currentUser = {
      uid: googleUser.id,
      isAnonymous: false,
      displayName: googleUser.displayName || googleUser.name || 'مستخدم جوجل',
      email: googleUser.email,
      photoURL: googleUser.imageUrl || googleUser.profilePictureUrl || null,
      providerId: 'google.com'
    };

    // Save session locally
    localStorage.setItem('khayatpro_user', JSON.stringify(currentUser));
    localStorage.setItem('khayatpro_token', cachedAccessToken!);
    localStorage.removeItem('khayatpro_local_account_uid');

    return { user: currentUser, accessToken: cachedAccessToken! };
  } catch (error: any) {
    console.error('Google Sign-in Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken || localStorage.getItem('khayatpro_token');
};

export const logout = async () => {
  if (isNative) {
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      await GoogleAuth.signOut();
    } catch (e) {}
  }
  
  localStorage.removeItem('khayatpro_user');
  localStorage.removeItem('khayatpro_token');
  localStorage.removeItem('khayatpro_local_account_uid');
  cachedAccessToken = null;
  currentUser = null;
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('khayatpro-logout'));
  }
};

