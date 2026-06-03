import { LuCloudUpload } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";
import { generateSopUrl } from "./config/api";

const acceptedFormats = ".pdf,.doc,.docx";
const introModalStorageKey = "sop-generator-hide-intro-modal";

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
  const [isTranscript, setIsTranscript] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [skipIntroOnThisBrowser, setSkipIntroOnThisBrowser] = useState(false);
  const [status, setStatus] = useState({
    tone: "idle",
    title: "Listo",
    message: "Sube un archivo fuente, agrega contexto y genera el documento SOP.",
  });

  const canSubmit = Boolean(selectedFile || notes.trim()) && !isSubmitting;

  useEffect(() => {
    try {
      const storedPreference =
        window.localStorage.getItem(introModalStorageKey) === "true";
      setSkipIntroOnThisBrowser(storedPreference);
      setShowIntroModal(!storedPreference);
    } catch {
      setShowIntroModal(true);
    }
  }, []);

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

  function closeIntroModal() {
    try {
      if (skipIntroOnThisBrowser) {
        window.localStorage.setItem(introModalStorageKey, "true");
      } else {
        window.localStorage.removeItem(introModalStorageKey);
      }
    } catch {
      // Ignore persistence errors and continue with the session.
    }

    setShowIntroModal(false);
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
    formData.append("is_transcript", String(isTranscript));

    setIsSubmitting(true);
    setStatus({
      tone: "loading",
      title: "Generando SOP",
      message: "Esto puede tardar unos momentos.",
    });

    try {
      const generateResponse = await fetch(generateSopUrl, {
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
                <LuCloudUpload />
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
                placeholder="Agrega detalles del incidente, restricciones, sistemas afectados o cualquier contexto adicional."
                rows="6"
                value={notes}
              />
            </label>

            <label className="toggle-card" htmlFor="is-transcript">
              <input
                checked={isTranscript}
                id="is-transcript"
                name="is-transcript"
                onChange={(event) => setIsTranscript(event.target.checked)}
                type="checkbox"
              />
              <span>
                El texto es una transcripcion. Si esta opcion esta marcada, las imagenes del
                archivo no se consideraran.
              </span>
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

      {showIntroModal ? (
        <div
          aria-labelledby="intro-modal-title"
          aria-modal="true"
          className="intro-modal-backdrop"
          role="dialog"
        >
          <div className="intro-modal">
            <div className="intro-modal-header">
              <p className="eyebrow">Antes de comenzar</p>
              <h3 id="intro-modal-title">Instrucciones y consideraciones</h3>
            </div>

            <div className="intro-modal-body">
              <p>
                Como consideracion principal, esta aplicacion genera un
                documento SOP a partir solo del archivo fuente y de notas
                adicionales.
              </p>

              <ul className="intro-modal-list">
                <li>Adjunta un archivo en formato PDF, DOC o DOCX.</li>
                <li>
                  Si lo necesitas, agrega notas con contexto, restricciones o
                  detalles del incidente.
                </li>
                <li>
                  Mientras mas claro sea el contenido de entrada, mejor sera el
                  resultado generado.
                </li>
                <li>
                  Verifica que la informacion cargada no incluya datos sensibles
                  que no deban procesarse.
                </li>
                <li>
                  Al finalizar, la aplicacion descargara automaticamente el
                  documento SOP en formato DOCX con un template establecido.
                </li>
              </ul>
            </div>

            <label className="intro-modal-preference" htmlFor="skip-intro-modal">
              <input
                checked={skipIntroOnThisBrowser}
                id="skip-intro-modal"
                onChange={(event) => setSkipIntroOnThisBrowser(event.target.checked)}
                type="checkbox"
              />
              <span>No volver a mostrar en este navegador</span>
            </label>

            <div className="intro-modal-actions">
              <button className="intro-modal-button" onClick={closeIntroModal} type="button">
                Entendido
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isSubmitting ? (
        <div
          aria-labelledby="loading-modal-title"
          aria-modal="true"
          className="loading-modal-backdrop"
          role="dialog"
        >
          <div className="loading-modal">
            <div className="loading-spinner" aria-hidden="true" />

            <div className="loading-copy">
              <p className="eyebrow">Procesando solicitud</p>
              <h3 id="loading-modal-title">{status.title}</h3>
              <p>{status.message}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
