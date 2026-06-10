import { LuCloudUpload } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";
import { parseSopUrl, analyzeChunkSopUrl, consolidateSopUrl, getConsolidateStatusUrl, documentSopUrl } from "./config/api";

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

async function downloadGeneratedDocument(response) {
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = extractFilename(response);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
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
      title: "Extrayendo texto del documento",
      message: "Se esta leyendo el documento fuente para dividirlo en partes.",
    });

    try {
      const parseResponse = await fetch(parseSopUrl, {
        method: "POST",
        body: formData,
      });

      if (!parseResponse.ok) {
        throw new Error(await readErrorDetail(parseResponse));
      }

      const { parsed_input, chunks } = await parseResponse.json();

      if (!chunks || chunks.length === 0) {
        throw new Error("No se pudo extraer texto del documento.");
      }

      let previous_analysis = null;
      const chunk_analyses = [];

      for (let i = 0; i < chunks.length; i++) {
        setStatus({
          tone: "loading",
          title: `Analizando parte ${i + 1} de ${chunks.length}`,
          message: "Se esta procesando el contenido fuente por partes para no perder el contexto.",
        });

        const chunkResponse = await fetch(analyzeChunkSopUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parsed_input: parsed_input,
            chunk: chunks[i],
            previous_analysis: previous_analysis,
          }),
        });

        if (!chunkResponse.ok) {
          throw new Error(await readErrorDetail(chunkResponse));
        }

        const { analysis } = await chunkResponse.json();
        chunk_analyses.push(analysis);
        previous_analysis = analysis;
      }

      setStatus({
        tone: "loading",
        title: "Consolidando analisis",
        message: "Se estan uniendo los resultados de todas las partes para tener una vista global.",
      });

      const consolidateResponse = await fetch(consolidateSopUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parsed_input: parsed_input,
          chunks: chunks,
          chunk_analyses: chunk_analyses,
        }),
      });

      if (!consolidateResponse.ok) {
        throw new Error(await readErrorDetail(consolidateResponse));
      }

      const { task_id } = await consolidateResponse.json();
      
      let finalAnalysis = null;
      
      // Polling loop
      while (true) {
        // Wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await fetch(getConsolidateStatusUrl(task_id));
        if (!statusResponse.ok) {
           throw new Error(await readErrorDetail(statusResponse));
        }
        
        const taskData = await statusResponse.json();
        
        if (taskData.status === "error") {
            throw new Error(taskData.detail || "Error en la consolidación en segundo plano.");
        }
        
        if (taskData.status === "completed") {
            finalAnalysis = taskData.result.analysis;
            break;
        }
        
        // If "processing", loop continues.
      }

      setStatus({
        tone: "loading",
        title: "Generando documento",
        message: "El analisis ya termino. Ahora se esta redactando y armando el SOP.",
      });

      const documentResponse = await fetch(documentSopUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalAnalysis),
      });

      if (!documentResponse.ok) {
        throw new Error(await readErrorDetail(documentResponse));
      }

      await downloadGeneratedDocument(documentResponse);

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
