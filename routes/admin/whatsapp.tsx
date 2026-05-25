import { PageProps } from "fresh";
import WhatsAppPanel from "../../islands/WhatsAppPanel.tsx";

export default function WhatsAppAdminPage(props: PageProps) {
  return (
    <div class="p-4">
      <h1 class="text-3xl font-bold mb-6">
        Panel de Administración WhatsApp Business
      </h1>
      <p class="mb-6 text-gray-600">
        Este panel te permite enviar mensajes y ver las respuestas recibidas
        desde la API de WhatsApp Business. Asegúrate de que tu webhook esté
        configurado correctamente para recibir mensajes entrantes.
      </p>

      <WhatsAppPanel />

      <div class="mt-8 bg-gray-50 p-4 rounded border">
        <h3 class="text-lg font-semibold mb-2">Configuración de Webhook</h3>
        <p class="mb-2">Para configurar tu webhook de WhatsApp Business:</p>
        <ol class="list-decimal pl-5 space-y-2">
          <li>
            Configura la URL del webhook en tu panel de Facebook App:{" "}
            <code>
              {`${props.url.protocol}//${props.url.host}/api/whatsapp-webhook`}
            </code>
          </li>
          <li>
            Usa el token de verificación configurado en las variables de
            entorno.
          </li>
          <li>
            Selecciona los campos de suscripción: <code>messages</code>,{" "}
            <code>message_deliveries</code>
          </li>
        </ol>
      </div>
    </div>
  );
}
