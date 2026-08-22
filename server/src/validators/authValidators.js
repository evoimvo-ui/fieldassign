import { z } from 'zod';

const registerSchema = z.object({
  orgName: z.string().min(1, 'Naziv organizacije je obavezan'),
  name: z.string().min(1, 'Ime je obavezno'),
  email: z.string().email('Neispravan format email adrese'),
  password: z.string()
    .min(8, 'Lozinka mora imati najmanje 8 karaktera')
    .regex(/[A-Z]/, 'Lozinka mora sadržavati barem jedno veliko slovo')
    .regex(/[a-z]/, 'Lozinka mora sadržavati barem jedno malo slovo')
    .regex(/[0-9]/, 'Lozinka mora sadržavati barem jedan broj'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Trenutna lozinka je obavezna'),
  newPassword: z.string()
    .min(8, 'Nova lozinka mora imati najmanje 8 karaktera')
    .regex(/[A-Z]/, 'Nova lozinka mora sadržavati barem jedno veliko slovo')
    .regex(/[a-z]/, 'Nova lozinka mora sadržavati barem jedno malo slovo')
    .regex(/[0-9]/, 'Nova lozinka mora sadržavati barem jedan broj'),
});

export { registerSchema, changePasswordSchema };
