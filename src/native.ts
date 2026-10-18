import { Capacitor } from '@capacitor/core'

// Deux cibles : le site web (PWA) et l'app iOS (Capacitor). Tout code propre à l'app native passe par ce test ;
// sur le web, il vaut toujours faux et rien ne change.

/** Vrai dans l'app iOS (Capacitor), faux dans un navigateur ou une PWA. */
export const isNative = (): boolean => Capacitor.isNativePlatform()
