import { useEffect, useState } from "preact/hooks";

interface Message {
  id: string;
  from: string;
  to?: string | string[];
  text: string;
  timestamp: string;
  direction: "incoming" | "outgoing";
  status?: "sent" | "delivered" | "read" | "failed";
  isGlobal?: boolean;
}

interface Contact {
  id: string;
  phoneNumber: string;
  name: string;
  tags: string[];
  lastContact?: string;
}

export default function WhatsAppPanel() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Nuevos estados para la funcionalidad ampliada
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [messageType, setMessageType] = useState<
    "individual" | "multiple" | "global"
  >("individual");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [availableTags, setAvailableTags] = useState<string[]>([
    "cliente",
    "prospecto",
    "importante",
    "nuevo",
  ]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState<
    { name: string; phoneNumber: string; tags: string[] }
  >({
    name: "",
    phoneNumber: "",
    tags: [],
  });

  // Inicializar WebSocket
  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl =
      `${wsProtocol}//${window.location.host}/websocket/wsBussiness`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Conexión WebSocket establecida");
      setConnected(true);
      setError(null);

      // Solicitar contactos al establecer conexión
      ws.send(JSON.stringify({
        type: "get_contacts",
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received:", data);

        // Manejar diferentes tipos de mensajes
        switch (data.type) {
          case "connection_established":
            console.log("Connected with ID:", data.clientId);
            break;

          case "whatsapp_message":
            // Mensaje recibido desde WhatsApp
            const incomingMsg = data.data;
            setMessages((prev) => [...prev, {
              id: incomingMsg.id,
              from: incomingMsg.from,
              text: incomingMsg.text?.body || "Media content",
              timestamp: new Date(parseInt(incomingMsg.timestamp) * 1000)
                .toISOString(),
              direction: "incoming",
            }]);
            break;

          case "status_update":
            // Actualización de estado de mensaje
            const statusData = data.data;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === statusData.id
                  ? { ...msg, status: statusData.status }
                  : msg
              )
            );
            break;

          case "message_queued":
            // Mensaje enviado a la cola
            setMessages((prev) => [...prev, {
              id: data.messageId,
              from: "me",
              to: messageType === "individual"
                ? phoneNumber
                : messageType === "multiple"
                ? selectedContacts
                : "global",
              text: messageText,
              timestamp: data.timestamp,
              direction: "outgoing",
              status: "sent",
              isGlobal: messageType === "global",
            }]);

            // Limpiar el campo de texto
            setMessageText("");
            break;

          case "contacts_list":
            // Recibir lista de contactos
            setContacts(data.contacts);
            break;

          case "contact_added":
            // Contacto añadido correctamente - Ahora solo actualizamos la UI
            // sin añadir el contacto nuevamente a la lista
            // El servidor ya se encargó de añadirlo y nos enviará una lista actualizada
            setShowAddContact(false);
            setNewContact({ name: "", phoneNumber: "", tags: [] });

            // Opcional: Solicitar lista actualizada de contactos
            ws.send(JSON.stringify({
              type: "get_contacts"
            }));
            break;

          case "error":
            setError(`Error: ${data.message}`);
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("Conexión WebSocket cerrada");
      setConnected(false);
      setError("Conexión cerrada");
    };

    ws.onerror = (error) => {
      console.error("Error en WebSocket:", error);
      setError("Error de conexión");
    };

    setSocket(ws);

    // Cargar contactos de ejemplo para la demo
    setContacts([
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
    ]);

    // Limpiar al desmontar
    return () => {
      ws.close();
    };
  }, []);

  // Filtrar contactos por etiquetas
  const filteredContacts = tagFilter
    ? contacts.filter((contact) => contact.tags.includes(tagFilter))
    : contacts;

  // Manejar selección de contactos
  const toggleContactSelection = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id)
        ? prev.filter((contactId) => contactId !== id)
        : [...prev, id]
    );
  };

  // Agregar nuevo contacto
  const addContact = () => {
    if (!socket || !connected) {
      setError("No se puede agregar contacto: verifica la conexión");
      return;
    }

    if (!newContact.name.trim() || !newContact.phoneNumber.trim()) {
      setError("El nombre y número de teléfono son obligatorios");
      return;
    }

    const contactId = crypto.randomUUID();
    const contact: Contact = {
      id: contactId,
      phoneNumber: newContact.phoneNumber,
      name: newContact.name,
      tags: newContact.tags,
      lastContact: new Date().toISOString(),
    };

    try {
      console.log("enviado contacto");
      socket.send(JSON.stringify({
        type: "add_contact",
        contact,
      }));

      // La respuesta se maneja en el evento onmessage
    } catch (error) {
      console.error("Error adding contact:", error);
      setError("Error al agregar contacto");
    }
  };

  // Manejar selección de etiquetas para nuevo contacto
  const toggleTagSelection = (tag: string) => {
    setNewContact((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // Enviar mensaje
  const sendMessage = () => {
    if (!socket || !connected) {
      setError("No se puede enviar mensaje: verifica la conexión");
      return;
    }

    if (!messageText.trim()) {
      setError("El mensaje no puede estar vacío");
      return;
    }

    // Validar el tipo de mensaje y destinatarios
    if (messageType === "individual" && !phoneNumber.trim()) {
      setError(
        "Se requiere un número de teléfono para enviar un mensaje individual",
      );
      return;
    }

    if (messageType === "multiple" && selectedContacts.length === 0) {
      setError(
        "Selecciona al menos un contacto para enviar un mensaje múltiple",
      );
      return;
    }

    try {
      socket.send(JSON.stringify({
        type: "send_message",
        messageType,
        message: {
          to: messageType === "individual"
            ? phoneNumber
            : messageType === "multiple"
            ? selectedContacts.map((id) => {
              const contact = contacts.find((c) => c.id === id);
              return contact ? contact.phoneNumber : "";
            }).filter(Boolean)
            : "all", // Para mensajes globales
          type: "text",
          text: {
            body: messageText,
          },
        },
      }));

      setError(null);

      // Si es un mensaje múltiple, limpiar selección
      if (messageType === "multiple") {
        setSelectedContacts([]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Error al enviar mensaje");
    }
  };

  return (
    <div class="p-4 max-w-6xl mx-auto">
      <h2 class="text-2xl font-bold mb-4">WhatsApp Business Panel</h2>

      {/* Estado de conexión */}
      <div class="mb-4">
        <div
          class={`inline-block w-3 h-3 rounded-full mr-2 ${
            connected ? "bg-green-500" : "bg-red-500"
          }`}
        >
        </div>
        <span>{connected ? "Conectado" : "Desconectado"}</span>
      </div>

      {/* Mensajes de error */}
      {error && (
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Layout principal */}
      <div class="flex flex-col md:flex-row gap-4">
        {/* Panel izquierdo: Contactos */}
        <div class="w-full md:w-1/3 bg-white border rounded p-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Contactos</h3>
            <button
              type="button"
              onClick={() => setShowAddContact(!showAddContact)}
              class="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
            >
              {showAddContact ? "Cancelar" : "Añadir contacto"}
            </button>
          </div>

          {/* Formulario para añadir contacto */}
          {showAddContact && (
            <div class="mb-4 p-3 bg-gray-50 rounded border">
              <h4 class="text-md font-medium mb-2">Nuevo contacto</h4>
              <div class="mb-2">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={newContact.name}
                  onInput={(e) =>
                    setNewContact({
                      ...newContact,
                      name: (e.target as HTMLInputElement).value,
                    })}
                  class="w-full px-3 py-2 border rounded mb-2"
                />
                <input
                  type="text"
                  placeholder="Número (con código de país, ej: 521234567890)"
                  value={newContact.phoneNumber}
                  onInput={(e) =>
                    setNewContact({
                      ...newContact,
                      phoneNumber: (e.target as HTMLInputElement).value,
                    })}
                  class="w-full px-3 py-2 border rounded"
                />
              </div>
              <div class="mb-3">
                <p class="text-sm text-gray-600 mb-1">Etiquetas:</p>
                <div class="flex flex-wrap gap-1">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTagSelection(tag)}
                      class={`text-xs py-1 px-2 rounded ${
                        newContact.tags.includes(tag)
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={addContact}
                class="bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded w-full"
              >
                Guardar contacto
              </button>
            </div>
          )}

          {/* Filtro de etiquetas */}
          <div class="mb-3">
            <p class="text-sm text-gray-600 mb-1">Filtrar por etiqueta:</p>
            <div class="flex flex-wrap gap-1">
              <button
                onClick={() => setTagFilter("")}
                class={`text-xs py-1 px-2 rounded ${
                  tagFilter === ""
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Todos
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  class={`text-xs py-1 px-2 rounded ${
                    tagFilter === tag
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de contactos */}
          <div class="overflow-y-auto max-h-[400px]">
            {filteredContacts.length === 0
              ? <p class="text-gray-500 text-center py-4">No hay contactos</p>
              : (
                <div class="space-y-2">
                  {console.log(filteredContacts)}
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      class={`p-2 border rounded ${
                        messageType === "multiple" &&
                          selectedContacts.includes(contact.id)
                          ? "bg-blue-50 border-blue-300"
                          : "bg-white"
                      }`}
                    >
                      <div class="flex justify-between">
                        <div>
                          <p class="font-medium">{contact.name}</p>
                          <p class="text-sm text-gray-600">
                            {contact.phoneNumber}
                          </p>
                        </div>

                        {messageType === "multiple" && (
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() => toggleContactSelection(contact.id)}
                            class="h-5 w-5 mt-1"
                          />
                        )}

                        {messageType === "individual" && (
                          <button
                            onClick={() => setPhoneNumber(contact.phoneNumber)}
                            class="text-sm bg-gray-200 hover:bg-gray-300 py-1 px-2 rounded"
                          >
                            Seleccionar
                          </button>
                        )}
                      </div>

                      {contact.lastContact && (
                        <p class="text-xs text-gray-500">
                          Último contacto:{" "}
                          {new Date(contact.lastContact).toLocaleDateString()}
                        </p>
                      )}

                      <div class="flex flex-wrap gap-1 mt-1">
                        {contact.tags.map((tag) => (
                          <span
                            key={tag}
                            class="bg-gray-100 text-xs py-0.5 px-1.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Panel derecho: Envío de mensajes e historial */}
        <div class="w-full md:w-2/3">
          {/* Formulario de envío */}
          <div class="mb-6 bg-white border rounded p-4">
            <h3 class="text-lg font-semibold mb-3">Enviar mensaje</h3>

            {/* Tipo de mensaje */}
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Tipo de mensaje</label>
              <div class="flex space-x-4">
                <label class="inline-flex items-center">
                  <input
                    type="radio"
                    value="individual"
                    checked={messageType === "individual"}
                    onChange={() => setMessageType("individual")}
                    class="mr-2"
                  />
                  Individual
                </label>
                <label class="inline-flex items-center">
                  <input
                    type="radio"
                    value="multiple"
                    checked={messageType === "multiple"}
                    onChange={() => setMessageType("multiple")}
                    class="mr-2"
                  />
                  Múltiple
                </label>
                <label class="inline-flex items-center">
                  <input
                    type="radio"
                    value="global"
                    checked={messageType === "global"}
                    onChange={() => setMessageType("global")}
                    class="mr-2"
                  />
                  Global
                </label>
              </div>
            </div>

            {/* Destinatario (solo para mensajes individuales) */}
            {messageType === "individual" && (
              <div class="mb-4">
                <label class="block text-gray-700 mb-2">
                  Número de teléfono (con código de país)
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onInput={(e) =>
                    setPhoneNumber((e.target as HTMLInputElement).value)}
                  placeholder="521234567890"
                  class="w-full px-3 py-2 border rounded"
                />
              </div>
            )}

            {/* Resumen de destinatarios para mensajes múltiples */}
            {messageType === "multiple" && (
              <div class="mb-4">
                <label class="block text-gray-700 mb-2">
                  Destinatarios seleccionados: {selectedContacts.length}
                </label>
                {selectedContacts.length > 0 && (
                  <div class="bg-gray-50 p-2 rounded border max-h-20 overflow-y-auto">
                    <ul class="list-disc pl-5 text-sm">
                      {selectedContacts.map((id) => {
                        const contact = contacts.find((c) => c.id === id);
                        return contact
                          ? (
                            <li key={id}>
                              {contact.name} ({contact.phoneNumber})
                            </li>
                          )
                          : null;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Información sobre mensajes globales */}
            {messageType === "global" && (
              <div class="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded">
                <p class="text-sm">
                  <strong>Mensaje global:</strong>{" "}
                  Se enviará a todos los contactos registrados en el sistema
                  ({contacts.length}).
                </p>
              </div>
            )}

            {/* Contenido del mensaje */}
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Mensaje</label>
              <textarea
                value={messageText}
                onInput={(e) =>
                  setMessageText((e.target as HTMLTextAreaElement).value)}
                rows={3}
                class="w-full px-3 py-2 border rounded"
                placeholder="Escribe tu mensaje aquí..."
              >
              </textarea>
            </div>

            <button
              onClick={sendMessage}
              disabled={!connected ||
                (messageType === "individual" && !phoneNumber.trim()) ||
                (messageType === "multiple" && selectedContacts.length === 0) ||
                !messageText.trim()}
              class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
            >
              Enviar mensaje
            </button>
          </div>

          {/* Lista de mensajes */}
          <div class="border rounded p-4 bg-white">
            <h3 class="text-lg font-semibold mb-2">Historial de mensajes</h3>

            <div class="max-h-[400px] overflow-y-auto">
              {messages.length === 0
                ? (
                  <p class="text-gray-500 text-center py-4">
                    No hay mensajes todavía
                  </p>
                )
                : (
                  <div class="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        class={`p-3 rounded ${
                          msg.direction === "incoming"
                            ? "bg-gray-100"
                            : "bg-blue-100"
                        } max-w-[80%] ${
                          msg.direction === "outgoing" ? "ml-auto" : ""
                        }`}
                      >
                        <div class="flex justify-between text-xs text-gray-500 mb-1">
                          {msg.direction === "incoming"
                            ? <span>De: {msg.from}</span>
                            : msg.isGlobal
                            ? <span>Mensaje global</span>
                            : Array.isArray(msg.to)
                            ? <span>Enviado a {msg.to.length} contactos</span>
                            : <span>Para: {msg.to}</span>}
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p>{msg.text}</p>
                        {msg.status && (
                          <div class="text-right text-xs text-gray-500 mt-1">
                            {msg.status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
