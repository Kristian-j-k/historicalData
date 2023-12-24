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
home += '<h1>Download CSV-fil med data, til Microsoft BI</h1>'
home += '<br>'
home += '<button onclick="makeAndDownLoadInvoiceLines()">Download CSV</button>'
app.innerHTML = home



/**Connection to CoDatahost ------------------------------------------------------------------------------------------ */
async function CDHCompanyApiGet(url){
   let cdh = await CDH.companyApi.get(url)
   console.log(cdh)
   return cdh
}

//get cardsale
async function CDHgetCardsaleTransactions(takeAmmount){
  let take = '&take=100'
  if(takeAmmount) take += `&take=${takeAmmount}`
  let url = `cardsale/transactions/items?orderby=CompanyTraceNo ASC${take}`
  let data = await CDHCompanyApiGet(url)

  return data.body
}

 

//Download file
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



//CSV Generate and Download
  async function makeAndDownLoadInvoiceLines(){
    let json_data = (await CDHgetCardsaleTransactions())
    let Transactions = Transactions_clean(json_data)
    
    let temp=''
    for(key in Transactions[0]) { //makes headers for the CSV file
      if(Transactions[0].hasOwnProperty(key)) {
          temp += key
          temp += ';'   
      }
    }
    temp += '\n'

    for(var i in Transactions){ //Prepare data for the CSV file
      let hasNext = false
      for(key in Transactions[i]) {  
        if(hasNext == true) temp += ';' //makes ; in between colms
        if(Transactions[i].hasOwnProperty(key)) {
            var value = Transactions[i][key];
            temp += value
            hasNext = true
        }
      }
        temp += '\n'
    }
    exportFile('InvoiceLines', temp)
}


// @param json_data the API result from CardsaleTransactions
// @returns Transactions where PartNo is replaced with ProductName

function Transactions_clean(json_data){
    let result = []

    json_data.Transactions.forEach(e=>{   //replace ParNo with ProductName
        let ProductName
            json_data.Products.forEach(p=>{
                if(p.PartNo == e.Product.PartNo)
                ProductName = p.ProductName         
            })
        let Longitude = ''
        let Latitude = ''
        
        const CDH_Transactions_Keys = {
            InvoiceUnitPrice : e.InvoiceUnitPrice,
            Quantity : e.Quantity,
            ServerSubTotal : e.ServerSubTotal,
            ServerTimestamp : e.ServerTimestamp,
            ServerUnitPrice : e.ServerUnitPrice,
            SiteName : e.SiteName,
            SiteNo : e.SiteNo,
            TerminalTimestamp : e.TerminalTimestamp,
            TerminalTraceNo : e.TerminalTraceNo,
            ProductName : ProductName,
            Latitude : Latitude,
            Longitude : Longitude,
        }
        result.push(structuredClone(CDH_Transactions_Keys))
    })
console.log(result)
    return result
}




/*

    let adjusted_Json_Data = structuredClone(json_data.Transactions); //clone, not to affect the original data

    adjusted_Json_Data.forEach(e=>{
        let tempObj = e
        for (let x in tempObj) {
            if(e[x].constructor.name === "Object"){
             
                let temp = ''
                for (let y in e[x]) {
                    let count = 0
                    json_data.Products.forEach(p=>{
                        if(p.PartNo == e[x][y])
                        temp += p.ProductName         //replace ParNo with ProductName
                        if(count<0 ){ temp += ','}
                        count++
                    })
                delete e[x]           //delete one value
                }

                e.ProductName = temp  //add new value
            }
          } 
    })
*/