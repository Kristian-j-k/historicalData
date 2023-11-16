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
  let take2
  (take)? take2 = `&take=${take}` : take2 = ''
  let url = `cardsale/transactions/items?filter=ServerTimestamp gt datetime%27${fromDate}%27&orderby=ServerTimestamp ASC${take2}`
  let data = await CDHCompanyApiGet(url)

  return data.body
}

//get geoLocations
async function CDHgetGeoLocations(){
  let take = `&take=1000` //todo is 1000 enough
  let url = `sites?${take}`
  let data = await CDHCompanyApiGet(url)
  if(data.body.PagerInfo.RecordCount < data.body.PagerInfo.TotalRecordCount) window.alert("The data could not load! contact administrator")
  return data.body.Sites
}

//appSettings
function CDHappSettings(){
  let companyNo = (CDH.companyNo)? CDH.companyNo : 'test_company'
console.warn(companyNo)
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
  console.warn(headers)
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

//find product name
function findProductName(data, no){

console.warn(data)
}

//savo to ah db
async function AHsaveToDb(data){
  console.warn(data.Transactions)
  console.warn("test")
let sites = await CDHgetGeoLocations()

data.Transactions.forEach(e => {
  let ProductName 
  let Longitude = 0
  let Latitude = 0
  data.Products.forEach(p=>{ 
    if(p.PartNo == e.Product.PartNo){ ProductName = p.ProductName } 
  })
  sites.forEach(s=>{
    if(s.GeoLocation) Longitude = s.GeoLocation.Longitude
    if(s.GeoLocation) Latitude = s.GeoLocation.Latitude
  })

   let temp = {
    ProductName : ProductName,
    InvoiceUnitPrice : e.InvoiceUnitPrice,
    Quantity : e.Quantity,
    ServerSubTotal : e.ServerSubTotal,
    ServerTimestamp : e.ServerTimestamp,
    ServerUnitPrice : e.ServerUnitPrice,
    SiteName : e.SiteName,
    SiteNo : e.SiteNo,
    TerminalTimestamp : e.TerminalTimestamp,
    Latitude : Latitude,
    Longitude : Longitude

   }

 
  AHpostApi('/api/test',temp)
})
} 
 


/**Autentification ---------------------------------------------------------------------------------------------------------------- */



/**New data -------------------------------------------------------------------------------------------------------------------------*/

//Any new records?
async function AnyNewRecords(){
  let take = 10 //todo 20000
  let count = 1 //todo 10

  while(true){
    let fromDate = await AhGetLatestTimestamp()
    let cardSaletransactions = await CDHgetCardsaleTransactions(fromDate, take)
    if(cardSaletransactions.PagerInfo.TotalRecordCount > 0){await AHsaveToDb(cardSaletransactions)} 

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
    
    let temp=''
    for(key in json_data[0]) { //makes headers for the CSV file
      if(json_data[0].hasOwnProperty(key)) {
          temp += key
          temp += ';'   
      }
    }
    temp += '\n'

    for(var i in json_data){ //Prepare data for the CSV file
      let hasNext = false
      for(key in json_data[i]) {  
        if(hasNext == true) temp += ';' //makes ; in between colms
        if(json_data[i].hasOwnProperty(key)) {
            var value = json_data[i][key];
            temp += value
            hasNext = true
        }
      }
        temp += '\n'
    }
    exportToCsv('InvoiceLines', temp)
}

