import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacidad | Bonoa",
  description: "Información de privacidad y tratamiento de datos en Bonoa.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidad"
      title="Tus datos, explicados sin letra pequeña."
      intro="Bonoa necesita algunos datos para mantener tu wallet, tu QR y tu relación con los negocios a los que decides unirte. Esta página resume qué tratamos y qué control tienes sobre esa información durante el piloto."
    >
      <section>
        <h2>Quién gestiona Bonoa</h2>
        <p>Bonoa es una iniciativa de Tramassso. Para consultas relacionadas con privacidad, acceso, rectificación o eliminación puedes escribir a <a href="mailto:partnerships@tramassso.com">partnerships@tramassso.com</a>.</p>
      </section>

      <section>
        <h2>Qué datos utilizamos</h2>
        <ul>
          <li>Datos de cuenta: nombre visible, correo electrónico e identificadores técnicos de autenticación.</li>
          <li>Datos de wallet: identificador de wallet, versión de QR, carnets, bonos, premios y su estado.</li>
          <li>Actividad de fidelización: visitas, compras registradas por el comercio, importes asociados a objetivos, progreso, recompensas y consumos.</li>
          <li>Preferencias: consentimiento opcional para comunicaciones comerciales o novedades de producto.</li>
          <li>Datos técnicos mínimos necesarios para seguridad, diagnóstico de errores y prevención de abuso.</li>
        </ul>
      </section>

      <section>
        <h2>Para qué se usan</h2>
        <p>Los datos se utilizan para crear y proteger tu cuenta, mostrar tu wallet, registrar correctamente el progreso de fidelización, permitir que los comercios validen operaciones, prevenir fraude, ofrecer soporte y mantener el servicio.</p>
        <p className="mt-3">Las comunicaciones comerciales y las novedades opcionales están desactivadas por defecto y puedes cambiar esas preferencias desde tu perfil. Los avisos estrictamente necesarios para prestar el servicio —por ejemplo, seguridad de cuenta o información sobre una operación— no se consideran comunicaciones promocionales.</p>
      </section>

      <section>
        <h2>Qué ve cada negocio</h2>
        <p>Un comercio accede únicamente a la información necesaria para gestionar tu relación con ese comercio: tu identificador Bonoa, actividad, progreso, bonos, premios y operaciones relacionadas con su propio negocio. No obtiene automáticamente tu actividad en otros comercios.</p>
      </section>

      <section>
        <h2>Proveedores técnicos</h2>
        <p>Bonoa utiliza servicios de infraestructura y base de datos como Supabase y Vercel. Estos proveedores pueden tratar datos técnicos necesarios para prestar el servicio de acuerdo con sus propias condiciones, medidas de seguridad y mecanismos aplicables de transferencia internacional.</p>
        <p className="mt-3">Bonoa no vende datos personales y actualmente no utiliza publicidad comportamental dentro de la wallet.</p>
      </section>

      <section>
        <h2>Sesión y almacenamiento local</h2>
        <p>La aplicación utiliza almacenamiento técnico del navegador para mantener tu sesión autenticada y recordar determinadas preferencias de la PWA. No se utiliza ese almacenamiento para crear perfiles publicitarios.</p>
      </section>

      <section>
        <h2>Conservación y eliminación</h2>
        <p>Mantenemos los datos mientras tu cuenta esté activa y mientras sean necesarios para prestar el servicio. Desde <Link href="/profile">tu perfil</Link> puedes solicitar la eliminación de la cuenta. La solicitud se registra para revisión y ejecución segura.</p>
        <p className="mt-3">Determinados registros de operaciones o auditoría pueden necesitar conservarse durante un periodo adicional o quedar anonimizados cuando sean necesarios para seguridad, prevención de fraude, resolución de incidencias u obligaciones aplicables.</p>
      </section>

      <section>
        <h2>Tus controles</h2>
        <ul>
          <li>Editar tu nombre visible desde el perfil.</li>
          <li>Activar o desactivar comunicaciones opcionales.</li>
          <li>Descargar una copia JSON de los principales datos asociados a tu wallet.</li>
          <li>Solicitar o cancelar una solicitud de eliminación de cuenta.</li>
          <li>Contactar con Tramassso para cualquier solicitud adicional sobre tus datos.</li>
        </ul>
      </section>

      <section>
        <h2>Menores</h2>
        <p>Bonoa no está dirigido específicamente a menores de 14 años. Si una persona no tiene capacidad suficiente para aceptar estas condiciones por sí misma, debe utilizar el servicio con la autorización que corresponda de su representante legal.</p>
      </section>
    </LegalPage>
  );
}
