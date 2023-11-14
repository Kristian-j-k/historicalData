/**
 * Build Html
 * 
 * Connection to CoDatahost
 * 
 * Connection to AH API
 * 
 * Autentification
 *  get userID
 * 
 * Check for new data
 *  Get latest date from AH API
 *  Get all data from CDH since latest
 *  Post new data to AH API
 * 
 * Download CSV
 *  
 * 
 */

//Build html
let app = document.getElementById('app')
let home =""
home += '<h1>Opdater Database</h1>'
home += '<br>'
home += '<button onclick="AnyNewRecords()">Tjek for ny data, og gem</button>'
home += '<br>'
home += '<h1>Download csv fil med invoices/lines, til Microsoft BI</h1>'
home += '<br>'
home += '<button onclick="makeAndDownLoadInvoiceLines()">Download csv</button>'
app.innerHTML = home



/**Connection to CoDatahost ------------------------------------------------------------------------------------------ */
async function CDHCompanyApiGet(url){
   let cdh = await CDH.companyApi.get(url)
   console.log(cdh)
   return cdh
}

//get cardsale
async function CDHgetCardsaleTransactions(fromDate, take){
  if(!fromDate) fromDate = '1779-01-01T00:00:00'
  let takeit
  (take)? takeit = `&take=${take}` : takeit = ''
  let url = `cardsale/transactions/items?filter=ServerTimestamp gt datetime%27${fromDate}%27&orderby=ServerTimestamp ASC${takeit}`
  let data = await CDHCompanyApiGet(url)
  return {
    TotalRecordCount : data.body.PagerInfo.TotalRecordCount, 
    Transactions : data.body.Transactions 
  }
}

//appSettings
function CDHappSettings(){
  let companyNo = (CDH.companyNo)? CDH.companyNo : 'test_company'

  return {companyNo : companyNo} 
}


/**Connection to AH API ---------------------------------------------------------------------------------------------------------- */
const baseUrl = 'https://testapi20231108.azurewebsites.net' //api/test

function AHheaders(){
const coNo = CDHappSettings()['companyNo']
  return   {
    headers: {
    'XApiKey': "4bc819e8-c062-4bfe-aa12-8e6ae08ace38",
    'companyNo': coNo,
    'user_hash': '123'
    }
  }
}

  
//AH Get
const AHget = async (url) => {
  const headers = await AHheaders()['headers']

console.warn(headers)

  try {
    return await axios.get(baseUrl+url, {headers})
  } catch (error) {
    console.error(error)
  }
}

//AH api
const AHgetApi = async () => {
  const api = await AHget('/api/test')
    return api
}

//AH Latest
const AhgetLatest = async () => {
  const latest = await AHget('/api/test/Latest')
    return latest
}

//AH POST
const AHpostApi = async (url,data) => {
  const headers = await AHheaders()['headers']
  try {
    return await axios.post(baseUrl+url,data, {headers})
    .then(function (response) {
      console.log(response);
    })
  }
  catch (error) {
    console.error(error)
  }
}

//Get latest date from AH API
const AhGetLatestTimestamp = async () => {
  const test = await AhgetLatest()
  if (test.data) {
    let result
    (test.data.indexOf(".") != -1)? result = test.data.slice(0,test.data.indexOf(".")) : result = test.data
    
    console.warn(result)
    return result
  }
}

//savo to ah db
async function AHsaveToDb(data){
  let temp = {
    //id : 1,
    text: data[0].CardSeriesDisplayName,
    number: data[0].Quantity,
    dato: data[0].ServerTimestamp
    }
  AHpostApi('/api/test',temp)
} 

//show data from ah todo delete
// async function AHshowDataFromAh(){
//   let data = await AHgetApi()
//   console.warn("AH Data")
//   console.warn(data)
// }
// AHshowDataFromAh()

/**Autentification ---------------------------------------------------------------------------------------------------------------- */



/**New data -------------------------------------------------------------------------------------------------------------------------*/

//Any new records?
async function AnyNewRecords(){
  let take = 2 //todo 20000
  let count = 2 //todo 10

  while(true){
    let fromDate = await AhGetLatestTimestamp()
    let cardSaletransactions = await CDHgetCardsaleTransactions(fromDate, take)
    if(cardSaletransactions.TotalRecordCount > 0) await AHsaveToDb(cardSaletransactions.Transactions)
    //await AHshowDataFromAh()
    if(cardSaletransactions.TotalRecordCount < take || count == 0){break}
    count--
  }
}


//Csv
function exportToCsv(filename, rows) {

    var blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

//Download Csv
  async function makeAndDownLoadInvoiceLines(){
    let json_data = (await AHgetApi()).data
    //console.warn(json_data)
    let temp=""
    for(var i in json_data){
        temp += json_data[i].id
        temp += ';'
        temp += json_data[i].text
        temp += ';'
        temp += json_data[i].number
        temp += ';'
        temp += json_data[i].dato
        temp += '\n'
    }
    exportToCsv('InvoiceLines', temp)
}

/* Run ---------------------------------------------------------------------------------*/


function run(){

}