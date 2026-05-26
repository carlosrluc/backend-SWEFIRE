window.addEventListener('load', () => {
    console.log('Swagger Custom script loaded.');

    const container = document.createElement('div');
    container.id = 'custom-curl-tester';
    container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: rgba(30, 30, 40, 0.98); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); padding: 15px; font-family: sans-serif; width: 400px; color: #fff; backdrop-filter: blur(10px); transition: all 0.3s ease; max-height: 80vh; display: flex; flex-direction: column;';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; cursor: pointer; user-select: none; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;';
    header.innerHTML = '<span>🚀 Ejecutar cualquier cURL</span><span id="curl-toggle-btn">▲</span>';
    container.appendChild(header);

    const content = document.createElement('div');
    content.id = 'curl-content';
    content.style.cssText = 'display: flex; flex-direction: column; gap: 8px; flex-grow: 1; overflow: hidden;';

    const textarea = document.createElement('textarea');
    textarea.placeholder = "Pega tu comando cURL aquí...\nEjemplo:\ncurl -X GET http://localhost:3000/api/solicitudes?nombre=Juan -H 'Authorization: Bearer <TOKEN>'";
    textarea.style.cssText = 'width: 100%; height: 100px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #a8ffb2; font-family: monospace; font-size: 11px; padding: 8px; resize: vertical; box-sizing: border-box;';
    content.appendChild(textarea);

    const btn = document.createElement('button');
    btn.innerText = 'Ejecutar Comando';
    btn.style.cssText = 'background: #2563eb; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s;';
    btn.onmouseover = () => btn.style.background = '#1d4ed8';
    btn.onmouseout = () => btn.style.background = '#2563eb';
    content.appendChild(btn);

    const resultTitle = document.createElement('div');
    resultTitle.innerText = 'Resultado:';
    resultTitle.style.cssText = 'font-size: 11px; color: #9ca3af; font-weight: bold;';
    content.appendChild(resultTitle);

    const resultPre = document.createElement('pre');
    resultPre.style.cssText = 'background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; font-family: monospace; font-size: 11px; color: #e5e7eb; overflow: auto; max-height: 200px; margin: 0; box-sizing: border-box; flex-grow: 1;';
    resultPre.innerText = 'Esperando comando...';
    content.appendChild(resultPre);

    container.appendChild(content);
    document.body.appendChild(container);

    let collapsed = false;
    const toggle = () => {
        collapsed = !collapsed;
        if (collapsed) {
            content.style.display = 'none';
            container.style.width = '200px';
            document.getElementById('curl-toggle-btn').innerText = '▲';
        } else {
            content.style.display = 'flex';
            container.style.width = '400px';
            document.getElementById('curl-toggle-btn').innerText = '▼';
        }
    };
    header.addEventListener('click', toggle);
    toggle(); // Start collapsed

    btn.addEventListener('click', async () => {
        const curlText = textarea.value.trim();
        if (!curlText) {
            resultPre.innerText = 'Por favor ingresa un comando cURL.';
            return;
        }
        resultPre.innerText = 'Ejecutando...';
        
        try {
            // Remove backslashes for line continuation and clean spaces
            const cleanCurl = curlText.replace(/\\\r?\n/g, ' ').replace(/\s+/g, ' ');
            
            // Extract URL
            const urlMatch = cleanCurl.match(/(?:['"])(https?:\/\/[^\s'"]+|localhost:[^\s'"]+|\/[^\s'"]+)(?:['"])/) || 
                             cleanCurl.match(/(https?:\/\/[^\s'"]+|localhost:[^\s'"]+)/);
            if (!urlMatch) {
                throw new Error('No se pudo encontrar la URL en el comando cURL.');
            }
            let url = urlMatch[1];
            
            // Method
            let method = 'GET';
            const methodMatch = cleanCurl.match(/(?:-X|--request)\s+(\w+)/i);
            if (methodMatch) {
                method = methodMatch[1].toUpperCase();
            } else if (cleanCurl.includes('-d ') || cleanCurl.includes('--data ') || cleanCurl.includes('--data-raw ')) {
                method = 'POST';
            }

            // Headers
            const headers = {};
            const headerRegex = /(?:-H|--header)\s+["']([^"']+)["']/g;
            let m;
            while ((m = headerRegex.exec(cleanCurl)) !== null) {
                const parts = m[1].split(':');
                if (parts.length >= 2) {
                    headers[parts[0].trim()] = parts.slice(1).join(':').trim();
                }
            }

            // Body
            let body = null;
            const bodyMatch = cleanCurl.match(/(?:-d|--data|--data-raw)\s+["']([\s\S]*?)["'](?=\s+-(?:H|X|d|-)|$)/) ||
                              cleanCurl.match(/(?:-d|--data|--data-raw)\s+(\{[^\}]+\})/);
            if (bodyMatch) {
                body = bodyMatch[1];
            }

            const response = await fetch(url, {
                method,
                headers,
                body: method !== 'GET' && method !== 'HEAD' ? body : undefined
            });

            const text = await response.text();
            let formattedResult = text;
            try {
                formattedResult = JSON.stringify(JSON.parse(text), null, 2);
            } catch(err) {}

            resultPre.innerText = `Status: ${response.status} ${response.statusText}\n\n${formattedResult}`;
        } catch (err) {
            resultPre.innerText = 'Error al parsear o ejecutar cURL:\n' + err.message;
        }
    });
});
