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
        // Also check for existing learners in Data sheet
        const dataSheet = ss.getSheetByName('Data');
        const learnerData = dataSheet.getDataRange().getValues();
        const existingLearners = [];
        let surveyorName = '';
        let surveyorMobile = '';

        for (let j = 1; j < learnerData.length; j++) {
          if (learnerData[j][0].toString() === udiseCode) {
            existingLearners.push({
              registrationNo: learnerData[j][3],
              name: learnerData[j][4],
              fatherHusbandName: learnerData[j][5],
              motherName: learnerData[j][6],
              maritalStatus: learnerData[j][7],
              age: learnerData[j][8],
              gender: learnerData[j][9],
              isDivyang: learnerData[j][10],
              divyangType: learnerData[j][11],
              category: learnerData[j][12],
              mobile: learnerData[j][13]
            });
            surveyorName = learnerData[j][14];
            surveyorMobile = learnerData[j][15];
          }
        }

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          assessmentCentre: data[i][1],
          nyayPanchayat: data[i][2],
          existingLearners: existingLearners,
          surveyorName: surveyorName,
          surveyorMobile: surveyorMobile
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
      surveyorMobile,
      isUpdate
    } = params;
    
    // If updating, remove existing rows for this UDISE code first
    if (isUpdate) {
      const rows = dataSheet.getDataRange().getValues();
      // Iterate backwards to avoid index shifting issues
      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][0].toString() === udiseCode) {
          dataSheet.deleteRow(i + 1);
        }
      }
    }
    
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
      message: isUpdate ? 'Data updated successfully' : 'Data saved successfully'
    })).setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.TEXT);
  }
}
