/**
 * Build Html
 * 
 * Connection to CoDatahost
 * 
 * Connection to AH API
 * 
 * Check for new data
 *  Get latest date from AH API
 *  Get all data from CDH since latest
 *  Post new data to AH API
 * 
 * Download CSV
 *  
 */





//Build html
let app = document.getElementById('app')
let home =""
home += '<h1>Opdater Database</h1>'
home += '<br>'
home += '<button onclick="AnyNewRecords()">Tjek for ny data, og gem</button><div id="countDown"></div>'
home += '<br>'
home += '<h1>Download CSV-fil med data, til Microsoft BI</h1>'
home += '<br>'
home += '<button onclick="makeAndDownLoadCSV()">Download CSV</button>'
app.innerHTML = home



/**Connection to CoDatahost ------------------------------------------------------------------------------------------ */
async function CDHappSettings(){
  let apikey = await CDH.appSettings.apikey
  console.log(apikey)
  return {apikey : apikey}
}


async function CDHCompanyApiGet(endpoint){
   let cdh = await CDH.companyApi.get(endpoint)
   console.log(cdh)
   return cdh
}

//get cardsale
async function CDHgetCardsaleTransactions(fromCompanyTraceNo,takeAmmount){
  let take = 10
  if(takeAmmount) take = takeAmmount
  let endpoint = `cardsale/transactions/items`
  let parameters = ''
  parameters += `?filter=CompanyTraceNo gt ${fromCompanyTraceNo}`
  parameters += `&orderby=CompanyTraceNo ASC`
  parameters += `&take=${take}`

  let data = await CDHCompanyApiGet(endpoint+parameters)

  return data.body
}


/**Connection to AH API ---------------------------------------------------------------------------------------------------------- */
const baseUrl = 'https://apisql20231223220750.azurewebsites.net/1/1234' 

//AH headers
function AHheaders(){
  let appsettings = CDHappSettings()
  return   {
    headers: {
    'XApiKey': appsettings.apikey, // kode til at få adgang til API på Azure
    'Content-Type': 'application/json',
    }
  }
}

//AH Get
const AHget = async (endpoint) => {
  const headers = await AHheaders()['headers']

  try {
    return await axios.get(baseUrl+endpoint, {headers})
  } catch (error) {
    console.error(error)
  }
}

//AH Latest
const AhgetLatest = async () => {
  const latest = await AHget('/LatestCompanyTraceNo')

    return latest.data
}


//AH api
const AHgetApi = async () => {
  const api = await AHget('/')
    return api.data
}



//AH POST
const AHpostApi = async (data) => {
  const headers = await AHheaders()['headers']
  try {
    return await axios.post(baseUrl+'/',data, {headers})
    .then(function (response) {
      console.log(response);
    })
  }
  catch (error) {
    console.error(error)
  }
}




//savo to ah db 
//runs through each property of the array, filter data and makes a Post each time
async function AHsaveToDb(data){

for (i = 0 ; i < data.Transactions.length ; i++){

  let e = data.Transactions[i]
  let ProductName 
  let Longitude = 0
  let Latitude = 0

  data.Products.forEach(p=>{ 
    if(p.PartNo == e.Product.PartNo){ ProductName = p.ProductName } 
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
    Longitude : Longitude,
    CompanyTraceNo : e.CompanyTraceNo
   }

  await AHpostApi(temp)
}
} 



/**New data -------------------------------------------------------------------------------------------------------------------------*/

//Any new records?
async function AnyNewRecords(){
  let take = 2 //todo 20000            //limit the size of the object to be handled
  let count = 1 //todo 10               //protects agains infinite or too many loop
  let countDown = document.getElementById("countDown")
  
  while(true){
    let fromCompanyTraceNo = await AhgetLatest()

    let cardSaletransactions = await CDHgetCardsaleTransactions(fromCompanyTraceNo, take)
    let records = cardSaletransactions.PagerInfo.TotalRecordCount
    countDown.innerHTML = ` Data som ikke er gemt  ${records}`
    if(cardSaletransactions.PagerInfo.TotalRecordCount > 0){await AHsaveToDb(cardSaletransactions)} 
    records = cardSaletransactions.TotalRecordCount
    if(cardSaletransactions.TotalRecordCount < take || count == 0){break }
    count--
  }
}


//Csv
function exportFile(filename, rows) {

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
  async function makeAndDownLoadCSV(){
    let json_data = (await AHgetApi())
    console.log(json_data)
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
    exportFile('InvoiceLines', temp)
}

