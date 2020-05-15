const XLSX = require('xlsx');
const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');

console.log(process.argv);

if (process.argv.length !== 4) {
  console.error(`You need to run node index.js <user> <password>!`);
  return;
}


const USER = process.argv[2];
const PW = process.argv[3];

const BASE_URL = "https://saisonarbeit2020.bauernverband.de";

// READ xlsx
const workbook = XLSX.readFile('worker.xlsx');
const sheet_name_list = workbook.SheetNames;

const harvestWorkers = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]], {raw: false});
const returningHarvestWorkers = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[1]], {raw: false});
const returnTrips = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[2]], {raw: false});

console.log("=== harvestWorkers ===");
console.log(harvestWorkers);

console.log("=== returningHarvestWorkers ===");
console.log(returningHarvestWorkers);

console.log("=== returnTrips ===");
console.log(returnTrips);

const FETCH_FUTURE_HARVEST_WORKER = (length) => `${BASE_URL}/harvest-worker/future?draw=1&columns%5B0%5D%5Bdata%5D=name&columns%5B0%5D%5Bname%5D=name&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=firstname&columns%5B1%5D%5Bname%5D=firstname&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=idnumber&columns%5B2%5D%5Bname%5D=idnumber&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=airport&columns%5B3%5D%5Bname%5D=airport&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=flightnumber&columns%5B4%5D%5Bname%5D=flightnumber&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=5&columns%5B5%5D%5Bname%5D=start_date&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=6&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=false&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=0&length=${length}&search%5Bvalue%5D=&search%5Bregex%5D=false&_=1589553450247`;
const FETCH_CURRENT_HARVEST_WORKER = (length) => `${BASE_URL}/harvest-worker/current?draw=1&columns%5B0%5D%5Bdata%5D=name&columns%5B0%5D%5Bname%5D=name&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=firstname&columns%5B1%5D%5Bname%5D=firstname&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=idnumber&columns%5B2%5D%5Bname%5D=idnumber&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=3&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=4&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=0&length=${length}&search%5Bvalue%5D=&search%5Bregex%5D=false&_=1589553450248`;
const FETCH_RETURN_TRIP_DATA = (length) => `${BASE_URL}/return-trip-data?draw=1&columns%5B0%5D%5Bdata%5D=date&columns%5B0%5D%5Bname%5D=date&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=infos&columns%5B1%5D%5Bname%5D=infos&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=count&columns%5B2%5D%5Bname%5D=count&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=3&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=false&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=0&length=${length}&search%5Bvalue%5D=&search%5Bregex%5D=false&_=1589553450249`;


function fetchData(uri) {
  return rp({
    method: 'GET',
    jar: true,
    uri,
    json: true
  }).then(workers => {
    console.log(workers);
    return workers;
  })
}


function getToken(uri) {
  return rp({
    method: 'GET',
    jar: true,
    uri
  }).then(body => {
    const $ = cheerio.load(body);
    const _token = $('input[name="_token"]').attr('value');
    console.log("FOUND TOKEN: ", _token);
    return _token;
  });
}

function editData(_token, data, uri) {

  const payload = {...data, _token, _method: 'PUT'};

  return rp({
    method: 'POST',
    jar: true,
    followAllRedirects: true,
    uri,
    formData: payload
  }).then(body => {
    const $ = cheerio.load(body);
    const text = $('div.alert').text();
    console.log("RESPONSE TEXT: ", text);
    return text;
  });
}

function processHarvestWorker() {
  return Promise.all(harvestWorkers.map(w => {
    if (w.id) {
      return getToken(`${BASE_URL}/harvest-worker/${w.id}/edit`).then(token => {
        return editData(token, w, `${BASE_URL}/harvest-worker/${w.id}`);
      });
    } else {
      return getToken(BASE_URL + '/harvest-worker/create').then(token => {
        return createData(token, w, BASE_URL + '/harvest-worker');
      });
    }
  })).then(() => {
    return fetchData(FETCH_FUTURE_HARVEST_WORKER(1)).then(({recordsTotal: total}) => {
      fetchData(FETCH_FUTURE_HARVEST_WORKER(total)).then(({data: workers}) => {
        const header = Object.keys(workers[0]);
        const headerString = header.join(";");

        fs.writeFileSync('./harvest-worker.csv', [headerString].concat(workers.map(d =>
          `${header.map(h => d[h]).join(";")}`)
        ).join("\n"), 'utf-8');
      });
    });
  });
}

function processReturningHarvestWorker() {
  return Promise.all(returningHarvestWorkers.map(w => {
    if (w.id) {
      return getToken(`${BASE_URL}/returning-harvest-worker/${w.id}/edit`).then(token => {
        return editData(token, w, `${BASE_URL}/returning-harvest-worker/${w.id}`);
      });
    } else {
      return getToken(BASE_URL + '/returning-harvest-worker/create').then(token => {
        return createData(token, w, BASE_URL + '/returning-harvest-worker');
      });
    }
  })).then(() => {
    return fetchData(FETCH_CURRENT_HARVEST_WORKER(1)).then(({recordsTotal: total}) => {
      fetchData(FETCH_CURRENT_HARVEST_WORKER(total)).then(({data: workers}) => {
        const header = Object.keys(workers[0]);
        const headerString = header.join(";");

        fs.writeFileSync('./returning-harvest-worker.csv', [headerString].concat(workers.map(d =>
          `${header.map(h => d[h]).join(";")}`)
        ).join("\n"), 'utf-8');
      });
    });
  });
}

function processReturnTrip() {
  return Promise.all(returnTrips.map(w => {
    if (w.id) {
      return getToken(`${BASE_URL}/return-trip/${w.id}/edit`).then(token => {
        return editData(token, w, `${BASE_URL}/return-trip/${w.id}`);
      });
    } else {
      return getToken(BASE_URL + '/return-trip/create').then(token => {
        return createData(token, w, BASE_URL + '/return-trip');
      });
    }
  })).then(() => {
    return fetchData(FETCH_RETURN_TRIP_DATA(1)).then(({recordsTotal: total}) => {
      fetchData(FETCH_RETURN_TRIP_DATA(total)).then(({data: workers}) => {
        const header = Object.keys(workers[0]);
        const headerString = header.join(";");

        fs.writeFileSync('./return-trip.csv', [headerString].concat(workers.map(d =>
          `${header.map(h => d[h]).join(";")}`)
        ).join("\n"), 'utf-8');
      });
    });
  });
}


function createData(_token, worker, uri) {
  const payload = {...worker, _token};
  return rp({
    method: 'POST',
    jar: true,
    followAllRedirects: true,
    uri,
    formData: payload
  }).then(body => {
    const $ = cheerio.load(body);
    const text = $('div.alert').text();
    console.log("RESPONSE TEXT: ", text);
    return text;
  });
}

// START
getToken(BASE_URL + "/login").then(_token => {
  return rp({
    method: 'POST',
    uri: BASE_URL + "/login",
    followAllRedirects: true,
    jar: true,
    formData: {
      _token,
      email: USER,
      password: PW
    }
  }).then(() => {
    return Promise.all([
      processHarvestWorker(),
      processReturningHarvestWorker(),
      processReturnTrip()]);
  });
}).catch(e => {
  console.error(e)
});