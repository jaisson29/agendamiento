import { Handlers } from "$fresh/server.ts";
import { WhatsAppWSManager } from "../../routes/websocket/wsBussiness.ts";

// Clave para verificar webhooks de WhatsApp - deberías guardarla en variables de entorno
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "tu_token_secreto";

export const handler: Handlers = {
  // Método GET para verificación de webhook de WhatsApp Business
  GET(req) {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    
    // Verificación del webhook según la documentación de WhatsApp Business API
    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN && challenge) {
      console.log("Webhook verificado con éxito");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    }
    
    console.error("Fallo en verificación de webhook");
    return new Response("Verification failed", { status: 403 });
  },
  
  // Método POST para recibir notificaciones de WhatsApp Business
  async POST(req) {
    try {
      const body = await req.json();
      console.log("Webhook notification received:", JSON.stringify(body));
      
      // Obtener instancia del gestor de WebSocket
      const wsManager = WhatsAppWSManager.getInstance();
      
      // Verificar si hay valor en body.object
      if (body.object === "whatsapp_business_account") {
        // Procesar entradas (pueden contener múltiples mensajes o actualizaciones)
        if (body.entry && Array.isArray(body.entry)) {
          for (const entry of body.entry) {
            // Procesar cambios en cada entrada
            if (entry.changes && Array.isArray(entry.changes)) {
              for (const change of entry.changes) {
                if (change.value && change.value.messages && Array.isArray(change.value.messages)) {
                  // Procesar mensajes entrantes
                  for (const message of change.value.messages) {
                    wsManager.processWhatsAppMessage({
                      id: message.id,
                      from: message.from,
                      timestamp: message.timestamp,
                      type: message.type,
                      text: message.text,
                      image: message.image
                      // Incluir otros campos según necesidad
                    });
                  }
                }
                
                // Procesar actualizaciones de estado de mensajes
                if (change.value && change.value.statuses && Array.isArray(change.value.statuses)) {
                  for (const status of change.value.statuses) {
                    wsManager.processStatusUpdate({
                      id: status.id,
                      status: status.status,
                      timestamp: status.timestamp,
                      recipient_id: status.recipient_id
                    });
                  }
                }
              }
            }
          }
        }
      }
      
      // WhatsApp requiere una respuesta 200 OK para confirmar la recepción
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
