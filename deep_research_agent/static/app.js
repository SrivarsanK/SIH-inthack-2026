/**
 * Gemini Deep Research Agent Workbench - Client App Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const agentSelect = document.getElementById('agentSelect');
  const collabPlanToggle = document.getElementById('collabPlanToggle');
  const visualizationToggle = document.getElementById('visualizationToggle');
  const toolSearch = document.getElementById('toolSearch');
  const toolUrl = document.getElementById('toolUrl');
  const toolCode = document.getElementById('toolCode');
  const fileStoreInput = document.getElementById('fileStoreInput');
  const mcpUrlInput = document.getElementById('mcpUrlInput');

  const promptInput = document.getElementById('promptInput');
  const startResearchBtn = document.getElementById('startResearchBtn');
  const startStreamBtn = document.getElementById('startStreamBtn');
  const statusPill = document.getElementById('statusPill');
  const statusText = document.getElementById('statusText');

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const attachmentList = document.getElementById('attachmentList');

  const planningSection = document.getElementById('planningSection');
  const planTextContent = document.getElementById('planTextContent');
  const refinementInput = document.getElementById('refinementInput');
  const refinePlanBtn = document.getElementById('refinePlanBtn');
  const approvePlanBtn = document.getElementById('approvePlanBtn');

  const streamSection = document.getElementById('streamSection');
  const interactionIdBadge = document.getElementById('interactionIdBadge');
  const streamLog = document.getElementById('streamLog');

  const reportSection = document.getElementById('reportSection');
  const reportText = document.getElementById('reportText');
  const visualGallery = document.getElementById('visualGallery');
  const galleryGrid = document.getElementById('galleryGrid');
  const copyReportBtn = document.getElementById('copyReportBtn');

  let attachments = [];
  let currentInteractionId = null;
  let activeEventSource = null;
  let rawReportMarkdown = "";

  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      promptInput.value = chip.dataset.prompt;
      promptInput.focus();
    });
  });

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#6366f1';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFiles(e.target.files);
    }
  });

  async function handleFiles(files) {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.attachment_item) {
          attachments.push(data);
          renderAttachments();
        }
      } catch (err) {
        alert('Upload failed: ' + err.message);
      }
    }
  }

  function renderAttachments() {
    attachmentList.innerHTML = '';
    attachments.forEach((att, idx) => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';
      chip.innerHTML = `
        <span>📎 ${att.filename} (${att.type})</span>
        <button style="background:none;border:none;color:#ef4444;cursor:pointer;" onclick="removeAttachment(${idx})">✖</button>
      `;
      attachmentList.appendChild(chip);
    });
  }

  window.removeAttachment = function(idx) {
    attachments.splice(idx, 1);
    renderAttachments();
  };

  function getRequestPayload() {
    const prompt = promptInput.value.trim();
    if (!prompt) return null;

    const payload = {
      prompt: prompt,
      agent: agentSelect.value,
      collaborative_planning: collabPlanToggle.checked,
      visualization: visualizationToggle.checked ? "auto" : "off",
      enable_google_search: toolSearch.checked,
      enable_url_context: toolUrl.checked,
      enable_code_execution: toolCode.checked,
    };

    if (fileStoreInput.value.trim()) {
      payload.file_search_store_names = [fileStoreInput.value.trim()];
    }

    if (mcpUrlInput.value.trim()) {
      payload.mcp_servers = [{ url: mcpUrlInput.value.trim() }];
    }

    if (attachments.length > 0) {
      payload.multimodal_attachments = attachments.map(a => a.attachment_item);
    }

    return payload;
  }

  function setStatus(state, label) {
    statusText.textContent = label;
    if (state === 'running') {
      statusPill.className = 'status-pill running';
    } else {
      statusPill.className = 'status-pill';
    }
  }

  startResearchBtn.addEventListener('click', async () => {
    const payload = getRequestPayload();
    if (!payload) {
      alert('Please enter a research prompt.');
      return;
    }

    resetUI();
    setStatus('running', 'Initiating Research...');

    try {
      const res = await fetch('/api/research/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === 'success') {
        currentInteractionId = data.interaction_id;
        interactionIdBadge.textContent = `ID: ${currentInteractionId}`;
        
        if (payload.collaborative_planning) {
          setStatus('running', 'Generating Research Plan...');
          pollStatus(currentInteractionId, true);
        } else {
          setStatus('running', 'Researching Background...');
          pollStatus(currentInteractionId, false);
        }
      } else {
        alert('Failed: ' + JSON.stringify(data));
        setStatus('ready', 'Error');
      }
    } catch (err) {
      alert('Error starting research: ' + err.message);
      setStatus('ready', 'Error');
    }
  });

  startStreamBtn.addEventListener('click', () => {
    const payload = getRequestPayload();
    if (!payload) {
      alert('Please enter a research prompt.');
      return;
    }

    resetUI();
    streamSection.style.display = 'block';
    setStatus('running', 'Streaming Progress...');

    const params = new URLSearchParams({
      prompt: payload.prompt,
      agent: payload.agent,
      collaborative_planning: payload.collaborative_planning,
      visualization: payload.visualization,
    });

    if (activeEventSource) activeEventSource.close();
    activeEventSource = new EventSource(`/api/research/stream?${params.toString()}`);

    let textBuffer = "";
    const imagesBuffer = [];

    activeEventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'created') {
        interactionIdBadge.textContent = `ID: ${data.id}`;
        appendStreamLog('status', `🚀 Interaction initialized (${data.id})`);
      } else if (data.type === 'thought') {
        appendStreamLog('thought', `💭 Thought: ${data.text}`);
      } else if (data.type === 'text') {
        textBuffer += data.text;
        appendStreamLog('text', data.text);
      } else if (data.type === 'image') {
        imagesBuffer.push(data.data);
        appendStreamLog('status', `🖼️ Visualization generated`);
      } else if (data.type === 'status') {
        appendStreamLog('status', `State transition: ${data.status}`);
      } else if (data.type === 'completed') {
        activeEventSource.close();
        setStatus('ready', 'Completed');
        if (payload.collaborative_planning) {
          showPlan(textBuffer);
        } else {
          showReport(textBuffer, imagesBuffer);
        }
      } else if (data.type === 'error') {
        activeEventSource.close();
        setStatus('ready', 'Error');
        appendStreamLog('status', `❌ Error: ${data.error}`);
      }
    };

    activeEventSource.onerror = () => {
      setStatus('ready', 'Disconnected');
    };
  });

  async function pollStatus(interactionId, isPlanningMode) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/research/status/${interactionId}`);
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          setStatus('ready', 'Completed');
          if (isPlanningMode) {
            showPlan(data.text);
          } else {
            showReport(data.text, data.images);
          }
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setStatus('ready', 'Failed');
          alert('Research task failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
  }

  refinePlanBtn.addEventListener('click', async () => {
    const feedback = refinementInput.value.trim();
    if (!feedback || !currentInteractionId) return;

    setStatus('running', 'Refining Plan...');
    try {
      const res = await fetch('/api/research/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previous_interaction_id: currentInteractionId,
          feedback: feedback,
          collaborative_planning: true,
          agent: agentSelect.value
        })
      });
      const data = await res.json();
      currentInteractionId = data.interaction_id;
      refinementInput.value = '';
      pollStatus(currentInteractionId, true);
    } catch (err) {
      alert('Refining plan failed: ' + err.message);
    }
  });

  approvePlanBtn.addEventListener('click', async () => {
    if (!currentInteractionId) return;

    setStatus('running', 'Plan Approved! Executing Research...');
    try {
      const res = await fetch('/api/research/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previous_interaction_id: currentInteractionId,
          feedback: "Plan looks good! Execute research.",
          collaborative_planning: false,
          agent: agentSelect.value
        })
      });
      const data = await res.json();
      currentInteractionId = data.interaction_id;
      planningSection.style.display = 'none';
      pollStatus(currentInteractionId, false);
    } catch (err) {
      alert('Plan approval failed: ' + err.message);
    }
  });

  function resetUI() {
    planningSection.style.display = 'none';
    streamSection.style.display = 'none';
    reportSection.style.display = 'none';
    streamLog.innerHTML = '';
    galleryGrid.innerHTML = '';
    rawReportMarkdown = "";
  }

  function appendStreamLog(type, content) {
    const line = document.createElement('div');
    line.className = `stream-line stream-${type}`;
    line.textContent = content;
    streamLog.appendChild(line);
    streamLog.scrollTop = streamLog.scrollHeight;
  }

  function showPlan(planText) {
    planningSection.style.display = 'block';
    planTextContent.innerHTML = marked.parse(planText);
    planningSection.scrollIntoView({ behavior: 'smooth' });
  }

  function showReport(text, images) {
    reportSection.style.display = 'block';
    rawReportMarkdown = text;
    reportText.innerHTML = marked.parse(text);

    if (images && images.length > 0) {
      visualGallery.style.display = 'block';
      galleryGrid.innerHTML = '';
      images.forEach(imgB64 => {
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${imgB64}`;
        galleryGrid.appendChild(img);
      });
    } else {
      visualGallery.style.display = 'none';
    }

    reportSection.scrollIntoView({ behavior: 'smooth' });
  }

  copyReportBtn.addEventListener('click', () => {
    if (rawReportMarkdown) {
      navigator.clipboard.writeText(rawReportMarkdown);
      copyReportBtn.textContent = '✅ Copied!';
      setTimeout(() => copyReportBtn.textContent = '📋 Copy Markdown', 2000);
    }
  });
});
