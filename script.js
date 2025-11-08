document.addEventListener('DOMContentLoaded', function() {
    
    // --- Efecto de Escritura en el Título ---
    const titleText = "> Cyber Log // Interceptando la Realidad // _";
    const titleElement = document.getElementById('main-title');
    let i = 0;

    function typeWriter() {
        if (i < titleText.length) {
            titleElement.innerHTML += titleText.charAt(i);
            i++;
            setTimeout(typeWriter, 90); // Velocidad de escritura
        } else {
            // Añade un cursor parpadeante al final
            titleElement.innerHTML += '<span style="animation: blink 1s step-end infinite;">_</span>';
        }
    }

    // Añade el CSS para el parpadeo del cursor (si no está ya en el HTML)
    const style = document.createElement('style');
    style.innerHTML += `
        @keyframes blink {
            from, to { opacity: 0 }
            50% { opacity: 1 }
        }
    `;
    document.head.appendChild(style);

    typeWriter(); // Inicia el efecto de escritura

    // --- Efecto de Lluvia de Código Binario (Matrix) ---
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const binary = '01'; // Caracteres para la lluvia
    const font_size = 16;
    const columns = canvas.width / font_size; // Número de columnas
    const drops = []; // Array para almacenar la posición 'y' de cada columna

    // Inicializar 'y' para cada columna
    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }

    function drawMatrix() {
        // Fondo semitransparente para el efecto de rastro
        ctx.fillStyle = 'rgba(13, 2, 8, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff00'; // Color del texto (verde neón)
        ctx.font = `${font_size}px monospace`;

        for (let i = 0; i < drops.length; i++) {
            // Un caracter binario aleatorio de '01'
            const text = binary.charAt(Math.floor(Math.random() * binary.length));
            // Dibuja el caracter en la posición (x, y)
            ctx.fillText(text, i * font_size, drops[i] * font_size);

            // Reinicia la columna si ha llegado al final
            // o de forma aleatoria para un efecto más "orgánico"
            if (drops[i] * font_size > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }

            // Incrementa la posición 'y'
            drops[i]++;
        }
    }

    // Adaptar el canvas al tamaño de la ventana
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Recalcular columnas y resetear drops
        const newColumns = canvas.width / font_size;
        drops.length = newColumns; // Ajustar tamaño del array
        for (let x = 0; x < newColumns; x++) {
            if (drops[x] === undefined) { // Si hay nuevas columnas, inicializarlas
                drops[x] = 1;
            }
        }
    });

    // Ejecuta la animación cada 33ms (aproximadamente 30 FPS)
    setInterval(drawMatrix, 33);

});
    document.head.appendChild(style);

    // Inicia el efecto
    typeWriter();

});
