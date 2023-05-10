//Quan fem clic al boto d'Envia, es guarden les sigles passades, 
//es criden les funcions de noticies i grafic, i es borren les instruccions
document.getElementById("boto").addEventListener("click", function () {
  let siglaEmpr1 = document.getElementById("sigles1").value;
  let siglaEmpr2 = document.getElementById("sigles2").value;
  let opcio = document.getElementById('opcio').selectedOptions[0].value;
  console.log(siglaEmpr1);
  console.log(siglaEmpr2);
  graficEmpr(siglaEmpr1, siglaEmpr2, grafic, opcio);
  noticies(siglaEmpr1, siglaEmpr2);
  if (document.contains(document.getElementById("instruc"))) {
    document.getElementById("instruc").remove();
}
});

//Al grafic se li passen les dues sigles, un div on pugui dibuixar el grafic, i l'interval de temps desitjat
async function graficEmpr(siglaEmpr1, siglaEmpr2, grafic, opcio) {
  const url = `https://twelve-data1.p.rapidapi.com/time_series?symbol=${siglaEmpr1},${siglaEmpr2}&interval=${opcio}&?format=json`;
  const options = {
    method: 'GET',
    headers: {
      'content-type': 'application/octet-stream',
      'X-RapidAPI-Key': 'f418d3a402mshcd58ccc2266413ep1318e4jsn29d1d90fce19',
      'X-RapidAPI-Host': 'twelve-data1.p.rapidapi.com'
    }
  };
  try {
    //Es fa fetch de l'API i el resultat es guarda com un JSON
    const response = await fetch(url, options);
    const result = await response.text();
    let resposta = JSON.parse(result);
    console.log(resposta);
    //S'agafen els resultats corresponents a les empreses seleccionades
    let valors1 = resposta[siglaEmpr1].values;
    let valors2 = resposta[siglaEmpr2].values;
    let valorbucle;
    //Segons l'interval, es determina quants valors volem al grafic (1 dia -> 24 h, 1 any -> 12 mesos,...)
    if (opcio == '1h') {
      valorbucle = 24;
    }
    else if (opcio == '1month') {
      valorbucle = 12;
    }
    else {
      valorbucle = valors1.length;
    }
    console.log(valorbucle);
    //Agafem els 4 valors necessaris per a fer el boxplot. L'average (molt teòric) ens servirà per a fer la linia de tendencia
    for (let i = 0; i < valorbucle; i++) {
      valors1[i].open = parseFloat(valors1[i].open);
      valors1[i].low = parseFloat(valors1[i].low);
      valors1[i].close = parseFloat(valors1[i].close);
      valors1[i].high = parseFloat(valors1[i].high);
      valors1[i]['average'] = ((parseFloat(valors1[i].open) + parseFloat(valors1[i].close)) / 2);
    };
    for (let i = 0; i < valorbucle; i++) {
      valors2[i].open = parseFloat(valors2[i].open);
      valors2[i].low = parseFloat(valors2[i].low);
      valors2[i].close = parseFloat(valors2[i].close);
      valors2[i].high = parseFloat(valors2[i].high);
      valors2[i]['average'] = ((parseFloat(valors2[i].open) + parseFloat(valors2[i].close)) / 2);
    };

    console.log(valors1);
    console.log(valors2);

    //Cridem a Highcharts per a que faci el grafic. El tipus boxplot és estàndard per a termes financers.
    Highcharts.chart(grafic, {
      chart: {
        type: 'boxplot',
        height: 600,
        width: 1400
      },

      title: {
        //selectedOptions[0] fa referencia a la opcio seleccionada
        text: `Evolució del stock de ${siglaEmpr1} i ${siglaEmpr2} els últims ${document.getElementById('opcio').selectedOptions[0].innerText}`
      },

      xAxis: {
        categories: resposta[siglaEmpr1].values.slice(0, valorbucle).map((e) => e.datetime).reverse(),
        title: {
          //selectedOptions[0] fa referencia a la opcio seleccionada
          text: `Dates dels últims ${document.getElementById('opcio').selectedOptions[0].innerText}`
        }
      },

      yAxis: {
        startOnTick: false,
        endOnTick: false,
        title: {
          text: 'Preu de stock en $'
        }
      },

      series: [{
        name: `Valors de ${siglaEmpr1}`,
        //Les dades es donen primer les més recents. S'agafen fins al valorbucle abans esmentat. 
        //Despres, es fa reverse, per a que la dada més recent ens quedi a la dreta.
        data: valors1.slice(0, valorbucle).map((e) => [e.low, e.open, null, e.close, e.high]).reverse(),
        color: '#DC4D01'
      },
      {
        // Add trendline for siglaEmpr1
        type: 'line',
        name: `Tendència de ${siglaEmpr1}`,
        //Invoquem la funcio que calcula la linia de tendencia (present més avall)
        data: calculateTrendline(valors1.slice(0, valorbucle).reverse()),
        color: '#FFD580'
      },
      {
        name: `Valors de ${siglaEmpr2}`,
        data: valors2.slice(0, valorbucle).map((e) => [e.low, e.open, null, e.close, e.high]).reverse(),
        color: '#00008B'
      },

      {
        // Add trendline for siglaEmpr2
        type: 'line',
        name: `Tendència de ${siglaEmpr2}`,
        data: calculateTrendline(valors2.slice(0, valorbucle).reverse()),
        color: '#ADD8E6'
      }
      ]
    });
  } catch (error) {
    console.error(error);
  }
}

//Aixo fa la tendencia. No ho entenc gaire. Fa servir el valor average (una mica inventat) que hem calculat abans
function calculateTrendline(data) {
  const values = data.map((e) => e.average);
  const length = values.length;
  const xValues = Array.from({ length }, (_, i) => i);
  const xSum = xValues.reduce((a, b) => a + b, 0);
  const ySum = values.reduce((a, b) => a + b, 0);
  const xySum = xValues.reduce((a, b, i) => a + b * values[i], 0);
  const xSquaredSum = xValues.reduce((a, b) => a + b ** 2, 0);
  const slope = (length * xySum - xSum * ySum) / (length * xSquaredSum - xSum ** 2);
  const intercept = (ySum - slope * xSum) / length;
  const trendline = xValues.map((x) => [x, slope * x + intercept]);
  return trendline;
}

//Funcio per a noticies. Nomes necessita les dues sigles
async function noticies(siglaEmpr1, siglaEmpr2) {
  const url = `https://api.marketaux.com/v1/news/all?symbols=${siglaEmpr1},${siglaEmpr2}&filter_entities=true&language=en&api_token=heP7MFGsDM4A8CJW5vOcxWvzExxQ64n3lwT8YJF0`
  const options = {
    method: 'GET',
    headers: {
      'content-type': 'application/octet-stream'
    }
  }
  const resposta = await fetch(url, options);
  const result = await resposta.text();
  let response = JSON.parse(result);
  console.log(response);
  let divPare = document.getElementById("noticies");
  
  //Borra les noticies anteriors per a que no es fiquin una sota l'altra
  while (divPare.firstChild){
    divPare.removeChild(divPare.firstChild);
  }

  //Basicament fem una consecucio d'appends i d'addicions de classes de Bootstrap per a que ens quedi l'estructura
  //desitjada. Hem ficat les noticies en un Grid per motius estètics.
  let titolPare = document.createElement("h2");
  titolPare.innerText = `Notícies sobre ${siglaEmpr1} i ${siglaEmpr2} (en anglès)`;
  titolPare.classList.add("text-center");
  titolPare.classList.add("mb-4");
  titolPare.classList.add("font-weight-bold");
  divPare.appendChild(titolPare);

  let gridContainer = document.createElement("div");
  gridContainer.classList.add("grid-container");


  for (let i = 0; i < 3; i++) {
    let divNoticia = document.createElement("div");
    divNoticia.classList.add("noticia");
    let titolNoticia = document.createElement("h4");
    titolNoticia.innerText = response.data[i].title;
    let imgNoticia = document.createElement("img");
    imgNoticia.src= response.data[i].image_url;
    imgNoticia.height=300;
    imgNoticia.alt = response.data[i].description;
    let snippet = document.createElement("p");
    snippet.innerText = response.data[i].snippet;
    let link = document.createElement("a");
    link.href = response.data[i].url;
    link.innerText="Llegir més -->";

    divNoticia.classList.add("text-center");
    divNoticia.classList.add("mb-5");
    divNoticia.classList.add("not"+(i+1))
    
    divNoticia.appendChild(titolNoticia);
    divNoticia.appendChild(imgNoticia);
    //El snippet és el començament del cos de la noticia retallat
    divNoticia.appendChild(snippet);
    divNoticia.appendChild(link);
    gridContainer.appendChild(divNoticia);
  }

  divPare.appendChild(gridContainer);
}


