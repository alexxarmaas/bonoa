import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Condiciones de uso | Bonoa",
  description: "Condiciones de uso de Bonoa durante su fase piloto.",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Condiciones de uso"
      title="Reglas claras para una fidelización sencilla."
      intro="Estas condiciones describen el funcionamiento general de Bonoa durante su fase piloto. Los beneficios concretos de cada carnet, bono o campaña los configura y ofrece el negocio correspondiente."
    >
      <section>
        <h2>Qué es Bonoa</h2>
        <p>Bonoa es una plataforma digital de fidelización impulsada por Tramassso. Permite mantener carnets digitales, registrar progreso, recibir bonos o recompensas y utilizar un único QR para identificar la wallet del cliente ante los negocios participantes.</p>
      </section>

      <section>
        <h2>Fase piloto</h2>
        <p>El servicio se encuentra en fase piloto. Podemos corregir, modificar o retirar funciones cuando sea necesario para mejorar estabilidad, seguridad o experiencia de uso. Intentaremos evitar cambios que alteren injustificadamente beneficios ya reconocidos a un usuario.</p>
      </section>

      <section>
        <h2>Cuenta y seguridad</h2>
        <ul>
          <li>Debes proporcionar información razonablemente correcta y mantener el acceso a tu cuenta bajo tu control.</li>
          <li>No debes compartir credenciales ni intentar manipular QR, operaciones, recompensas, referidos o sistemas antifraude.</li>
          <li>Podemos bloquear temporalmente una operación o investigar actividad anómala cuando existan indicios técnicos de duplicidad, abuso o fraude.</li>
        </ul>
      </section>

      <section>
        <h2>Carnets, progreso y recompensas</h2>
        <p>El negocio define las reglas de su programa: número de compras o visitas, importes mínimos, productos asociados, recompensas, vigencia y otras condiciones visibles en Bonoa. El progreso se registra a partir de las operaciones que el propio negocio valida.</p>
        <p className="mt-3">Un carnet permanente representa tu relación con un negocio y no se consume al conseguir un premio. Los bonos y recompensas sí pueden tener saldo, usos, límites o fecha de caducidad.</p>
      </section>

      <section>
        <h2>Responsabilidad del negocio</h2>
        <p>Cada negocio es responsable de la oferta comercial que publica o configura en Bonoa: precio, impuestos, disponibilidad, calidad del producto o servicio, condiciones de canje y cumplimiento de la recompensa prometida.</p>
        <p className="mt-3">Durante el piloto, Bonoa no procesa el pago de las compras o bonos mostrados. Cuando exista un pago, se realiza directamente entre cliente y negocio por los medios que éste determine.</p>
      </section>

      <section>
        <h2>Valor de los beneficios</h2>
        <p>Salvo que el negocio indique expresamente lo contrario, los puntos de progreso, carnets, bonos promocionales y recompensas no son dinero, no generan intereses y no pueden canjearse por efectivo.</p>
      </section>

      <section>
        <h2>Disponibilidad del servicio</h2>
        <p>Bonoa se diseña para estar disponible de forma continua, pero durante el piloto pueden existir mantenimientos, incidencias de red o interrupciones de proveedores externos. Conservamos registros de operaciones para reducir el riesgo de duplicados y facilitar la recuperación ante incidencias.</p>
      </section>

      <section>
        <h2>Privacidad</h2>
        <p>El tratamiento de datos se explica en la <a href="/privacidad">información de privacidad de Bonoa</a>. Las comunicaciones opcionales se pueden controlar desde el perfil y no están activadas por defecto.</p>
      </section>

      <section>
        <h2>Soporte y contacto</h2>
        <p>Para incidencias con la plataforma o cuestiones sobre tu cuenta puedes escribir a <a href="mailto:partnerships@tramassso.com">partnerships@tramassso.com</a>. Para problemas con un producto, compra o recompensa concreta, el primer responsable es el negocio que la ofrece.</p>
      </section>
    </LegalPage>
  );
}
