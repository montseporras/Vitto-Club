import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca un endpoint (o un controller entero) como accesible sin iniciar sesión.
// Solo deja la marca: quien la lee y decide es el guard, que vive en auth.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
