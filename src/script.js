// Lógica de manipulação do DOM (Inclusão e Remoção) - Escopo Global
function removerWidget(id) {
    $(id).fadeOut(300);
}

function toggleWidget(id) {
    if ($(id).is(':visible')) {
        $(id).appendTo('#dashboard');
    } else {
        $(id).fadeIn(300).appendTo('#dashboard');
    }
}

$(document).ready(function() {
    const urlServidor = "http://localhost:8080";
    let tokenValido = "";

    // Dados históricos simulados para alimentar os Histogramas (Séries Temporais)
    const historicoChuva = [5, 12, 0, 0, 8, 15, 22, 3];
    const historicoTemp = [22, 24, 26, 25, 23, 21, 20, 22];
    const labelsHoras = ["02h", "05h", "08h", "11h", "14h", "17h", "20h", "23h"];

    function autenticarEstacao() {
        $.get(`${urlServidor}/aut?usuario=admin&senha=123456`, function(resposta) {
            if (resposta.includes("TOKEN=")) {
                tokenValido = resposta.split("TOKEN=")[1].trim();
                console.log("Autenticado! Token:", tokenValido);

                atualizarPainelCompleto();

                // Renderiza os gráficos da avaliação imediatamente
                desenharHistogramaSimples();
                desenharHistogramaSobreposto();

                // Loop de atualização em tempo real
                setInterval(atualizarPainelCompleto, 5000);
            }
        }).fail(function() {
            console.error("Servidor desconectado. Renderizando gráficos com dados locais...");
            desenharHistogramaSimples();
            desenharHistogramaSobreposto();
            // Mantém um mapa inicial padrão mesmo offline para testes
            atualizarMapaGoogle("-12.9714", "-38.5014");
        });
    }

    function lerSensorMeteorologico(codigoSensor, elementoHtmlId, sufixoUnidade) {
        if (!tokenValido) return;

        $.get(`${urlServidor}/get?token=${tokenValido}&sensor=${codigoSensor}`, function(respostaBruta) {
            let valorLimpo = respostaBruta.replace('v', '').trim();
            $(`#${elementoHtmlId}`).html(`${valorLimpo}<span class="data-unit">${sufixoUnidade}</span>`);

            // REQUISITO: Indicador Visual Instantâneo Dinâmico
            if(codigoSensor === "a3") {
                let porcentagem = Math.min(Math.max(parseInt(valorLimpo), 0), 100);
                $("#bar-luminosidade").css("width", `${porcentagem}%`);
            }
        });
    }

    // REQUISITO: Histograma para série temporal simples
    function desenharHistogramaSimples() {
        const canvas = document.getElementById('chart-chuva');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const larguraBarra = 25;
        const espacamento = 12;
        const margemEsquerda = 20;

        for (let i = 0; i < historicoChuva.length; i++) {
            let alturaBarra = historicoChuva[i] * 4;
            let x = margemEsquerda + i * (larguraBarra + espacamento);
            let y = canvas.height - alturaBarra - 20;

            ctx.fillStyle = '#3498db';
            ctx.fillRect(x, y, larguraBarra, alturaBarra);

            ctx.fillStyle = '#2c3e50';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${historicoChuva[i]}mm`, x - 2, y - 5);
            ctx.fillText(labelsHoras[i], x, canvas.height - 5);
        }
    }

    // REQUISITO: Histograma para séries temporais sobrepostas
    function desenharHistogramaSobreposto() {
        const canvas = document.getElementById('chart-sobreposto');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const larguraBarra = 25;
        const espacamento = 12;
        const margemEsquerda = 20;

        for (let i = 0; i < historicoChuva.length; i++) {
            let x = margemEsquerda + i * (larguraBarra + espacamento);

            let altChuva = historicoChuva[i] * 4;
            let yChuva = canvas.height - altChuva - 20;
            ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
            ctx.fillRect(x, yChuva, larguraBarra, altChuva);

            let altTemp = historicoTemp[i] * 3;
            let yTemp = canvas.height - altTemp - 20;
            ctx.fillStyle = 'rgba(230, 126, 34, 0.8)';
            ctx.fillRect(x + 5, yTemp, larguraBarra - 10, altTemp);

            ctx.fillStyle = '#2c3e50';
            ctx.font = '9px sans-serif';
            ctx.fillText(labelsHoras[i], x, canvas.height - 5);
        }

        ctx.fillStyle = '#3498db'; ctx.fillRect(10, 10, 10, 10);
        ctx.fillStyle = '#2c3e50'; ctx.fillText("Chuva", 25, 18);
        ctx.fillStyle = '#e67e22'; ctx.fillRect(70, 10, 10, 10);
        ctx.fillStyle = '#2c3e50'; ctx.fillText("Temp", 85, 18);
    }

    // Função auxiliar para atualizar o Google Maps na tela dinamicamente (Correção da String)
    function atualizarMapaGoogle(latitude, longitude) {
        const novaUrlMapa = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
        $("#google-maps-frame").attr("src", novaUrlMapa);
        $("#val-geo").text(`Lat: ${latitude} | Lon: ${longitude}`);
    }

    // Centralizador único de execuções periódicas
    function atualizarPainelCompleto() {
        console.log("Atualizando dados dos sensores...");
        lerSensorMeteorologico("a1", "val-temp", "°C");
        lerSensorMeteorologico("a2", "val-pressao", " hPa");
        lerSensorMeteorologico("a3", "val-luminosidade", " Lux");

        // Mantém a localização atualizada com base nas coordenadas da estação
        atualizarMapaGoogle("-12.9714", "-38.5014");
    }

    // Executa a autenticação inicial
    autenticarEstacao();
});