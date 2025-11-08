document.addEventListener('DOMContentLoaded', function() {
    
    // Texto que quieres que aparezca en el título
    const titleText = "> Cyber Log_";
    const titleElement = document.getElementById('main-title');
    let i = 0;

    function typeWriter() {
        if (i < titleText.length) {
            // Escribe la letra
            titleElement.innerHTML += titleText.charAt(i);
            i++;
            // Llama a la función de nuevo después de un breve retraso
            setTimeout(typeWriter, 120); // Velocidad de escritura
        } else {
            // Añade un cursor parpadeante al final
            titleElement.innerHTML += '<span style="animation: blink 1s step-end infinite;">_</span>';
        }
    }

    // Añade el CSS para el parpadeo del cursor (necesario para el efecto)
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes blink {
            from, to { opacity: 0 }
            50% { opacity: 1 }
        }
    `;
    document.head.appendChild(style);

    // Inicia el efecto
    typeWriter();
});