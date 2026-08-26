# Bonoa

**Todos tus bonos, beneficios y fidelizaciones. Un solo QR.**

Bonoa es una wallet digital de bonos y fidelización pensada para que un cliente pueda llevar todos sus bonos en un único lugar y para que los negocios puedan validarlos mediante QR.

## Estado actual

MVP 0.1 en desarrollo.

Incluido en `feat/wallet-foundation`:

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Wallet cliente mobile-first
- Bonos activos, agotados y próximos a caducar
- Detalle de bono
- QR funcional con payload demo
- Historial de consumos
- Perfil básico
- Datos mock tipados
- Variables de entorno preparadas para Supabase

## Desarrollo local

```bash
npm install
npm run dev
```

Después abre `http://localhost:3000`.

## Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

El frontend funciona actualmente con datos mock hasta que se conecte el proyecto Supabase de Bonoa.

## Arquitectura prevista

Bonoa tendrá backend independiente de Tramassso durante el MVP. Tramassso se usa como referencia visual y podrá integrarse posteriormente mediante identidad compartida, enlaces o API.

Entidades principales previstas:

- `profiles`
- `businesses`
- `business_members`
- `loyalty_products`
- `wallets`
- `passes`
- `redemptions`

Los consumos serán transaccionales e inmutables y el QR no incluirá saldo ni datos sensibles.

## Ramas

- `main`: estable
- `develop`: integración
- `feat/*`: desarrollo de funcionalidades
