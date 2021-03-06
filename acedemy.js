const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');


if (process.argv.length !== 4) {
  console.error(`You need to run node index.js <user> <password>!`);
  return;
}

const MANDANT = "karlsmarkt";
const USER = parseInt(process.argv[2]);
const PW = process.argv[3];

const BASE_URL = "https://www.karlsmarkt-admin.academymaker.de/academymaker";

async function login() {
  return rp({
    method: 'POST',
    followAllRedirects: true,
    rejectUnauthorized: false,
    jar: true,
    uri: BASE_URL + '/login.do',
    formData: {
      kundennummerLogin: MANDANT,
      loginLogin: USER,
      passwordLogin: PW
    }
  })
}

async function fullUserList() {
  const uri = BASE_URL + `/sortPersons.do?count=10000`;
  return rp({
    method: 'GET',
    followAllRedirects: true,
    rejectUnauthorized: false,
    jar: true,
    uri,
  });
}

async function listUsers() {
  const uri = BASE_URL + `/listPersons.do`;
  return rp({
    method: 'GET',
    followAllRedirects: true,
    rejectUnauthorized: false,
    jar: true,
    uri,
  });
}

async function showUser(id) {
  const uri = BASE_URL + `/viewPerson.do?id=${id}`;
  return rp({
    method: 'GET',
    followAllRedirects: true,
    rejectUnauthorized: false,
    jar: true,
    uri,
  });
}

function getUsersFromHtml(html) {
  const $ = cheerio.load(html);
  const table = $('.tableList');
  return $(table).find('tbody > tr').map((i, row) => ({
    id: $(row).attr("id"),
    lastName: $(row).find('td:nth-of-type(3)').text().trim(),
    firstName: $(row).find('td:nth-of-type(4)').text().trim(),
    email: $(row).find('td:nth-of-type(5)').text().trim()
  })).get()
}

function getId(text) {
  if (text) {
    const matches = text.match(/&id=(\d+)/);
    if (matches && matches.length) {
      return matches[1];
    }
  }
  return null;
}

function getTrainingsFromHtml(html) {
  const $ = cheerio.load(html);
  const table = $('.tableTrainingHeading').first().parent();
  const tableLogin = $('table.viewDataTable')[1];

  const tds = $(tableLogin).find("tr td");

  const username = $(tds[1]).text().trim();
  const firstLogin = $(tds[5]).text().trim();
  const lastLogin = $(tds[7]).text().trim();


  return $(table).find('tbody > tr:not(.viewDataTableDetailRow)').map((i, row) => ({
    id: getId($(row).find('td:nth-of-type(3) > a').attr("onclick")),
    username,
    firstLogin,
    lastLogin,
    name: $(row).find('td:nth-of-type(3)').text().trim(),
    status: $(row).find('td:nth-of-type(4)').text().trim(),
    ergebnis: $(row).find('td:nth-of-type(5)').text().trim().replace(/(?:\t|\n)/g, ''),
    datum: $(row).find('td:nth-of-type(7)').text().trim().replace(/(?:\t|\n|Download)/g, '')
  })).get().filter(t => t.name !== '')
}

function writeCsv(users) {
  const header = ["iduser", "lastName", "firstName", "email", "username", "firstLogin", "lastLogin", "idtraining", "name", "status", "ergebnis", "datum"];
  const headerString = header.join(";");
  const data = [headerString];

  for (const user of users) {
    for (const training of user.trainings) {
      data.push(`${user.id};${user.lastName};${user.firstName};${user.email};${training.username};${training.firstLogin};${training.lastLogin};${training.id};${training.name};${training.status};${training.ergebnis};${training.datum}`)
    }
  }
  fs.writeFileSync(`./trainings.csv`, data.join("\n"), 'utf-8');
}


// START
async function main() {
  await login();
  // needs to be called first :shrug:
  await listUsers();
  const usersHtml = await fullUserList();
  const users = getUsersFromHtml(usersHtml)
  for (const u of users) {
    const detailHtml = await showUser(u.id);
    u.trainings = getTrainingsFromHtml(detailHtml);
  }
  writeCsv(users);
}

main();