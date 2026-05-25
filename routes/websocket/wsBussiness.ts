import { Handlers } from "$fresh/server.ts";

// Interfaz para los mensajes de WhatsApp Business
interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "document" | "location" | "contact";
  text?: {
    body: string;
  };
  image?: {
    id: string;
    caption?: string;
    mime_type: string;
  };
  // Otros tipos de mensajes pueden ser definidos según necesidad
}

// Interfaz para las notificaciones de estado
interface MessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
}

// Interfaz para los contactos
interface Contact {
  id: string;
  phoneNumber: string;
  name: string;
  tags: string[];
  lastContact?: string;
}

// Gestor de sesiones de WebSocket para WhatsApp
export class WhatsAppWSManager {
  private clients = new Map<string, WebSocket>();
  private contacts: Contact[] = [];
  private static instance: WhatsAppWSManager;

  static getInstance(): WhatsAppWSManager {
    if (!WhatsAppWSManager.instance) {
      WhatsAppWSManager.instance = new WhatsAppWSManager();
    }
    return WhatsAppWSManager.instance;
  }

  constructor() {
    // Inicializar con algunos contactos de ejemplo
    this.contacts = [
      {
        id: "1",
        phoneNumber: "5211234567890",
        name: "Juan Pérez",
        tags: ["cliente", "importante"],
        lastContact: "2025-04-20T10:30:00Z",
      },
      {
        id: "2",
        phoneNumber: "5219876543210",
        name: "María López",
        tags: ["prospecto"],
        lastContact: "2025-04-15T14:20:00Z",
      },
      {
        id: "3",
        phoneNumber: "5215555555555",
        name: "Carlos Gómez",
        tags: ["cliente", "nuevo"],
        lastContact: "2025-04-28T08:45:00Z",
      },
    ];
  }

  addClient(id: string, socket: WebSocket): void {
    this.clients.set(id, socket);
    console.log(`WhatsApp client registered: ${id}`);
  }

  removeClient(id: string): void {
    this.clients.delete(id);
    console.log(`WhatsApp client removed: ${id}`);
  }

  broadcastMessage(message: unknown): void {
    this.clients.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    });
  }

  sendToClient(id: string, message: unknown): boolean {
    const socket = this.clients.get(id);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Procesar mensajes entrantes de WhatsApp
  processWhatsAppMessage(message: WhatsAppMessage): void {
    console.log(`Received WhatsApp message: ${JSON.stringify(message)}`);

    // Actualizar el último contacto si el remitente está en nuestra lista
    const senderPhone = message.from.replace("whatsapp:", "");
    const contactIndex = this.contacts.findIndex((c) =>
      c.phoneNumber === senderPhone
    );

    if (contactIndex >= 0) {
      this.contacts[contactIndex].lastContact = new Date().toISOString();
    }

    // Aquí puedes implementar lógica específica según el tipo de mensaje
    switch (message.type) {
      case "text":
        // Procesar mensaje de texto
        console.log(`Text message from ${message.from}: ${message.text?.body}`);
        break;
      case "image":
        // Procesar imagen
        console.log(`Image received from ${message.from}`);
        break;
        // Casos para otros tipos de mensajes
    }

    // Broadcast el mensaje a los clientes interesados o procesarlo internamente
    this.broadcastMessage({
      type: "whatsapp_message",
      data: message,
    });
  }

  // Procesar actualizaciones de estado de mensajes
  processStatusUpdate(status: MessageStatus): void {
    console.log(`Message status update: ${status.id} is now ${status.status}`);

    // Notificar a los clientes sobre el cambio de estado
    this.broadcastMessage({
      type: "status_update",
      data: status,
    });
  }

  // Añadir un nuevo contacto
  addContact(contact: Contact): void {
    // Verificar si ya existe un contacto con el mismo número
    const existingIndex = this.contacts.findIndex((c) =>
      c.phoneNumber === contact.phoneNumber
    );

    if (existingIndex >= 0) {
      // Actualizar contacto existente
      this.contacts[existingIndex] = {
        ...this.contacts[existingIndex],
        ...contact,
        id: this.contacts[existingIndex].id, // Mantener el ID original
      };
    } else {
      // Agregar nuevo contacto
      this.contacts.push(contact);
    }

    // Notificar a los clientes sobre el nuevo contacto
    this.broadcastMessage({
      type: "contact_added",
      contact,
    });
  }

  // Obtener todos los contactos
  getContacts(): Contact[] {
    return this.contacts;
  }

  // Enviar mensaje a múltiples destinatarios
  async sendBulkMessage(
    messageType: "individual" | "multiple" | "global",
    recipients: string | string[] | "all",
    messageContent: { type: string; text?: { body: string } },
  ): Promise<{ messageId: string; timestamp: string }> {
    console.log(`Sending ${messageType} message to:`, recipients);

    let targetPhones: string[] = [];

    // Determinar los destinatarios
    if (messageType === "individual") {
      targetPhones = [recipients as string];
    } else if (messageType === "multiple" && Array.isArray(recipients)) {
      targetPhones = recipients;
    } else if (messageType === "global" || recipients === "all") {
      // Para mensajes globales, enviar a todos los contactos
      targetPhones = this.contacts.map((contact) => contact.phoneNumber);
    }

    console.log(`Will send to ${targetPhones.length} recipients`);

    // En una implementación real, aquí llamarías a la API de WhatsApp Business
    // para enviar los mensajes a cada destinatario

    // Simular una respuesta exitosa de la API de WhatsApp
    return {
      messageId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Instancia del gestor de WebSocket para WhatsApp
const whatsAppManager = WhatsAppWSManager.getInstance();

export const handler: Handlers = {
  GET(req) {
    if (req.headers.get("upgrade") != "websocket") {
      return new Response(null, { status: 501 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    const clientId = crypto.randomUUID();

    socket.onopen = () => {
      console.log(`WhatsApp Business WebSocket connection opened: ${clientId}`);
      whatsAppManager.addClient(clientId, socket);

      // Enviar mensaje de bienvenida
      socket.send(JSON.stringify({
        type: "connection_established",
        clientId: clientId,
        message: "Connected to WhatsApp Business WebSocket",
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`Received from client ${clientId}:`, data);

        // Manejar diferentes tipos de solicitudes
        switch (data.type) {
          case "send_message":
            // Lógica para enviar mensaje a WhatsApp
            console.log(
              `Sending WhatsApp message: ${JSON.stringify(data.message)}`,
            );

            try {
              // Enviar el mensaje usando el manejador de envío masivo
              const result = await whatsAppManager.sendBulkMessage(
                data.messageType ?? "individual",
                data.message.to,
                {
                  type: data.message.type,
                  text: data.message.text,
                },
              );

              // Notificar al cliente que el mensaje fue puesto en cola
              socket.send(JSON.stringify({
                type: "message_queued",
                messageId: result.messageId,
                timestamp: result.timestamp,
              }));
            } catch (error: unknown) {
              if (error instanceof Error) {
                console.error("Error sending message:", error);
                socket.send(JSON.stringify({
                  type: "error",
                  message: "Error sending message: " + error.message,
                }));
              } else {
                console.error(error);
              }
            }
            break;

          case "get_message_status":
            // Verificar estado de un mensaje
            socket.send(JSON.stringify({
              type: "message_status",
              messageId: data.messageId,
              status: "delivered", // Este sería un valor real de la API
            }));
            break;

          case "get_contacts":
            // Devolver lista de contactos
            socket.send(JSON.stringify({
              type: "contacts_list",
              contacts: whatsAppManager.getContacts(),
            }));
            break;

          case "add_contact":
            // Agregar un nuevo contacto
            if (data.contact) {
              whatsAppManager.addContact(data.contact);
              console.log("sendindg contact added");
              socket.send(JSON.stringify({
                type: "contact_added",
                contact: data.contact,
              }));
            } else {
              console.log("sendindg contact added");
              socket.send(JSON.stringify({
                type: "error",
                message: "Invalid contact data",
              }));
            }
            break;

          case "webhook_verification":
            // Manejar verificación de webhook
            console.log("Processing webhook verification");
            break;

          default:
            socket.send(JSON.stringify({
              type: "error",
              message: "Unknown request type",
            }));
        }
      } catch (error) {
        console.error(`Error processing message from ${clientId}:`, error);
        socket.send(JSON.stringify({
          type: "error",
          message: "Invalid message format",
        }));
      }
    };

    socket.onclose = () => {
      console.log(`WhatsApp Business WebSocket connection closed: ${clientId}`);
      whatsAppManager.removeClient(clientId);
    };

    socket.onerror = (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
    };

    return response;
  },
};
