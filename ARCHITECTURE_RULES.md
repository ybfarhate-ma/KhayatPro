# KHAYATPRO ARCHITECTURE RULES

This project is STRICTLY OFFLINE-FIRST.

Forbidden technologies:
- Firebase
- Firestore
- Supabase
- Realtime databases
- Cloud sync systems
- Remote customer storage

Required technologies:
- SQLite local database
- Capacitor
- React
- TypeScript
- Google Sign-In only
- Google Drive backup only

Customer data must NEVER leave the user's device except: direct encrypted backup to the user's own Google Drive account.
النوافذ المنبثقة التحذيرة او التوديهية او غيرها من النوافذ المنبثقة ينبغي ان تكون من ضمن نوافذ التطبيق وينبغي الاستغناء كليا عن نوافذ المتصفح المنبثقة  وهذا امر اجباري وليس اختياري وغي قال للتنازل عنه.