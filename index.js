const XLSX = require('xlsx');
const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');

console.log(process.argv);

if(process.argv.length !== 4){
  console.error(`You need to run node index.js <user> <password>!`);
  return;
}


let USER = process.argv[2];
let PW = process.argv[3];
const LOGIN_URL = "https://saisonarbeit2020.bauernverband.de/login";

// READ xlsx
const workbook = XLSX.readFile('worker.xlsx');
const sheet_name_list = workbook.SheetNames;
const workers = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]], {raw: false});
console.log(workers);

function fetchWorker(length) {
  return rp({
    method: 'GET',
    jar: true,
    uri: `https://saisonarbeit2020.bauernverband.de/harvest-worker?draw=1&columns%5B0%5D%5Bdata%5D=name&columns%5B0%5D%5Bname%5D=name&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=firstname&columns%5B1%5D%5Bname%5D=firstname&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=idnumber&columns%5B2%5D%5Bname%5D=idnumber&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=airport&columns%5B3%5D%5Bname%5D=airport&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=flightnumber&columns%5B4%5D%5Bname%5D=flightnumber&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=5&columns%5B5%5D%5Bname%5D=start_date&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=6&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=false&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=0&length=${length}&search%5Bvalue%5D=&search%5Bregex%5D=false&_=1586334550599`,
    json: true
  }).then(workers => {
    console.log(workers);
    return workers;
  })
}

function getCreateToken() {

  return rp({
    method: 'GET',
    jar: true,
    uri: 'https://saisonarbeit2020.bauernverband.de/harvest-worker/create'
  }).then(body => {

    const $ = cheerio.load(body);
    const _token = $('input[name="_token"]').attr('value');


    console.log("CREATE TOKEN: ", _token);

    return _token;
  });
}

function createWorker(_token, worker) {

  const payload = {...worker, _token};

  return rp({
    method: 'POST',
    jar: true,
    followAllRedirects: true,
    uri: 'https://saisonarbeit2020.bauernverband.de/harvest-worker',
    formData: payload
  }).then(body => {
    const $ = cheerio.load(body);
    const text = $('div.alert').text();
    console.log("RESPONSE TEXT: ", text);
    return text;
  });
}

// GET Login -> extract _token

rp({
  method: 'GET',
  uri: LOGIN_URL,
  followAllRedirects: true,
  jar: true
}).then(body => {
  const $ = cheerio.load(body);
  const _token = $('input[name="_token"]').attr('value');

  console.log("token: ", _token);

  return rp({
    method: 'POST',
    uri: LOGIN_URL,
    followAllRedirects: true,
    jar: true,
    formData: {
      _token,
      email: USER,
      password: PW
    }
  }).then(() => {
    return Promise.all(workers.map(w => {
      return getCreateToken().then(token => {
        return createWorker(token, w);
      })
    })).then(() => {
      return fetchWorker(workers.length).then(res => {

        const workers = res.data;
        const header = Object.keys(workers[0]);
        const headerString = header.join(";");

        fs.writeFileSync('./worker.csv', [headerString].concat(workers.map(d =>
          `${header.map(h => d[h]).join(";")}`)
        ).join("\n"), 'utf-8');
      });
    });
  });

}).catch(e => {
  console.error(e)
});