import { useRef, useState } from "react";

const acceptedFormats = ".pdf,.doc,.docx";
const generateApiPath =
  import.meta.env.VITE_SOP_GENERATE_API_PATH ||
  import.meta.env.VITE_SOP_API_PATH ||
  "https://sop-app-byccdteeb0evhwhh.canadacentral-01.azurewebsites.net/api/v1/sops/generate";

function extractFilename(response) {
  const header = response.headers.get("content-disposition");
  if (!header) {
    return "generated-sop.docx";
  }

  const match = header.match(/filename="?([^"]+)"?/i);
  return match?.[1] || "generated-sop.docx";
}

async function readErrorDetail(response) {
  let errorDetail = "No se pudo completar la solicitud.";

  try {
    const errorBody = await response.json();
    errorDetail = errorBody.detail || errorDetail;
  } catch {
    errorDetail = response.statusText || errorDetail;
  }

  return errorDetail;
}

function App() {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({
    tone: "idle",
    title: "Listo",
    message: "Sube un archivo fuente, agrega contexto y genera el documento SOP.",
  });

  const canSubmit = Boolean(selectedFile || notes.trim()) && !isSubmitting;

  function updateFile(file) {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setStatus({
      tone: "idle",
      title: "Archivo adjunto",
      message: `${file.name} esta listo para procesarse.`,
    });
  }

  function handleFileInput(event) {
    updateFile(event.target.files?.[0] || null);
  }

  function handleDragState(event, active) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(active);
  }

  function handleDrop(event) {
    handleDragState(event, false);
    updateFile(event.dataTransfer.files?.[0] || null);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
    }
    if (notes.trim()) {
      formData.append("description", notes.trim());
    }

    setIsSubmitting(true);
    setStatus({
      tone: "loading",
      title: "Generando SOP",
      message: "La API esta procesando la fuente, analizando el incidente y creando el archivo DOCX.",
    });

    try {
      const generateResponse = await fetch(generateApiPath, {
        method: "POST",
        body: formData,
      });

      if (!generateResponse.ok) {
        throw new Error(await readErrorDetail(generateResponse));
      }

      const blob = await generateResponse.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = extractFilename(generateResponse);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setStatus({
        tone: "success",
        title: "SOP generado",
        message: "El archivo DOCX se descargo correctamente.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Error en la generacion",
        message: error instanceof Error ? error.message : "Error inesperado.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />

      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" />
          <div>
            <p className="eyebrow">Generador SOP</p>
          </div>
        </div>

      </header>

      <main className="content-grid">
        <section className="panel panel-form">
          <div className="panel-header">
            <div>
              <h2>Generador de SOP</h2>
            </div>
          </div>

          <form className="generator-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              accept={acceptedFormats}
              className="sr-only"
              onChange={handleFileInput}
              type="file"
            />

            <button
              className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
              onClick={openFilePicker}
              onDragEnter={(event) => handleDragState(event, true)}
              onDragLeave={(event) => handleDragState(event, false)}
              onDragOver={(event) => handleDragState(event, true)}
              onDrop={handleDrop}
              type="button"
            >
              <span className="upload-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" role="presentation">
                  <path d="M45 48h7a8 8 0 0 0 1-16 15 15 0 0 0-28.8-4.7A12 12 0 0 0 12 39a9 9 0 0 0 9 9h8" />
                  <path d="M32 22v24" />
                  <path d="m22 32 10-10 10 10" />
                </svg>
              </span>
              <span className="dropzone-title">
                {selectedFile ? selectedFile.name : "Arrastra y suelta un archivo aqui"}
              </span>
              <span className="dropzone-copy">
                {selectedFile
                  ? `${Math.max(selectedFile.size / 1024, 1).toFixed(0)} KB seleccionados`
                  : "o haz clic para elegir un documento desde tu equipo"}
              </span>
            </button>

            <p className="support-copy">
              Formatos compatibles: PDF, DOC, DOCX
            </p>

            <label className="notes-block" htmlFor="notes">
              <span>Notas y contexto</span>
              <textarea
                id="notes"
                name="notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Agrega detalles del incidente, restricciones, sistemas afectados o cualquier contexto que la API deba considerar."
                rows="6"
                value={notes}
              />
            </label>

            <div className={`status-card status-${status.tone}`}>
              <strong>{status.title}</strong>
              <p>{status.message}</p>
            </div>

            <button className="generate-button" disabled={!canSubmit} type="submit">
              {isSubmitting ? "Generando..." : "Generar SOP"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
