/**
 * Google Apps Script Code
 * 
 * Instructions:
 * 1. Create a new Google Sheet.
 * 2. Rename the first sheet to "Sheet1" and add headers: UDISE Code, Name of Assessment Centre, Nyay Panchayat.
 * 3. Create a second sheet named "Data" and add headers: 
 *    udise code, name of assessment centre, nyay panchayat, Registration No., Name of Learner in English, 
 *    Father's/Husband's Name of Learner, Mother's Name of Learner, Marital Status of Learner, 
 *    Age of Learner, Gender, Whether DIVYANG, Type of Divyang, Category, Mobile number of Learner,
 *    Name of Surveyor, Mobile no of Surveyor
 * 4. Go to Extensions > Apps Script.
 * 5. Paste this code into the editor.
 * 6. Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 * 7. Copy the Web App URL and paste it into the React app's GAS_URL constant.
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'fetchUdise') {
    const udiseCode = e.parameter.udiseCode;
    const sheet1 = ss.getSheetByName('Sheet1');
    const data = sheet1.getDataRange().getValues();
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === udiseCode) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          assessmentCentre: data[i][1],
          nyayPanchayat: data[i][2]
        })).setMimeType(ContentService.MimeType.TEXT);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'UDISE Code not found'
    })).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName('Data');
    
    const { 
      udiseCode, 
      assessmentCentre, 
      nyayPanchayat, 
      learners, 
      surveyorName, 
      surveyorMobile 
    } = params;
    
    learners.forEach(learner => {
      dataSheet.appendRow([
        udiseCode,
        assessmentCentre,
        nyayPanchayat,
        learner.registrationNo,
        learner.name,
        learner.fatherHusbandName,
        learner.motherName,
        learner.maritalStatus,
        learner.age,
        learner.gender,
        learner.isDivyang,
        learner.divyangType,
        learner.category,
        learner.mobile,
        surveyorName,
        surveyorMobile
      ]);
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
