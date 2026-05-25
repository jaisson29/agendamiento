/**
 * Script para manejar las operaciones Docker del proyecto
 */

// Leer el archivo de configuración deno.json
const readConfig = async (): Promise<{ name: string; version: string }> => {
  try {
    const text = await Deno.readTextFile("./deno.json");
    const config = JSON.parse(text);
    // Extraer el nombre del proyecto sin el prefijo de organización
    const name = config.name.replace(/^@[^/]+\//, "");
    const version = config.version || "latest";
    return { name, version };
  } catch (error) {
    console.error("Error al leer deno.json:", error);
    return { name: "agendamiento", version: "latest" };
  }
};

// Ejecutar un comando en la terminal
const runCommand = async (cmd: string): Promise<void> => {
  console.log(`Ejecutando: ${cmd}`);

  const command = Deno.build.os === "windows"
    ? new Deno.Command("cmd", { args: ["/c", cmd] })
    : new Deno.Command("sh", { args: ["-c", cmd] });

  const { code, stdout, stderr } = await command.output();

  if (code === 0) {
    console.log(new TextDecoder().decode(stdout));
  } else {
    console.error(`Error (${code}):`);
    console.error(new TextDecoder().decode(stderr));
  }
};

// Construir la imagen Docker
const buildImage = async (): Promise<void> => {
  const { name, version } = await readConfig();
  const imageTag = `${name}:${version}`;
  await runCommand(`docker build -t ${imageTag} .`);
  console.log(`Imagen construida: ${imageTag}`);
};

// Ejecutar el contenedor Docker
const runContainer = async (): Promise<void> => {
  const { name, version } = await readConfig();
  const imageTag = `${name}:${version}`;
  await runCommand(
    `docker run --name ${name + version} -p 8000:8000 ${imageTag}`,
  );
};

// Procesar argumentos de línea de comandos
if (import.meta.main) {
  const command = Deno.args[0];

  switch (command) {
    case "build":
      await buildImage();
      break;
    case "run":
      await runContainer();
      break;
    default:
      console.log(`
Uso:
  deno run -A scripts/docker.ts build  # Construir la imagen Docker
  deno run -A scripts/docker.ts run    # Ejecutar el contenedor Docker
      `);
  }
}
