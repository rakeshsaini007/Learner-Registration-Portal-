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
  
  // Helper to clean UDISE codes (handles scientific notation, decimals, and padding)
  const cleanUdise = (val) => {
    if (!val) return "";
    return val.toString().split('.')[0].split('E')[0].trim().padStart(11, '0');
  };

  if (action === 'fetchUdise') {
    const udiseCode = cleanUdise(e.parameter.udiseCode);
    const sheet1 = ss.getSheetByName('Sheet1');
    if (!sheet1) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Sheet1 not found' })).setMimeType(ContentService.MimeType.TEXT);
    }
    
    const data = sheet1.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const sheetUdise = cleanUdise(data[i][0]);
      if (sheetUdise === udiseCode) {
        const dataSheet = ss.getSheetByName('Data');
        const existingLearners = [];
        let surveyorName = '';
        let surveyorMobile = '';

        if (dataSheet) {
          const learnerData = dataSheet.getDataRange().getValues();
          for (let j = 1; j < learnerData.length; j++) {
            const learnerUdise = cleanUdise(learnerData[j][0]);
            if (learnerUdise === udiseCode) {
              existingLearners.push({
                registrationNo: learnerData[j][3].toString(),
                name: learnerData[j][4].toString(),
                fatherHusbandName: learnerData[j][5].toString(),
                motherName: learnerData[j][6].toString(),
                maritalStatus: learnerData[j][7].toString(),
                age: learnerData[j][8].toString(),
                gender: learnerData[j][9].toString(),
                isDivyang: learnerData[j][10].toString().toUpperCase().startsWith('Y') ? 'Y' : 'N',
                divyangType: learnerData[j][11].toString(),
                category: learnerData[j][12].toString(),
                mobile: learnerData[j][13].toString()
              });
              surveyorName = learnerData[j][14].toString();
              surveyorMobile = learnerData[j][15].toString();
            }
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName('Data');
    
    if (!dataSheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Sheet named "Data" not found'
      })).setMimeType(ContentService.MimeType.TEXT);
    }

    const params = JSON.parse(e.postData.contents);
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
      const searchUdise = udiseCode.toString().trim().padStart(11, '0');
      // Iterate backwards to avoid index shifting issues
      for (let i = rows.length - 1; i >= 1; i--) {
        const rowUdise = rows[i][0].toString().split('.')[0].trim().padStart(11, '0');
        if (rowUdise === searchUdise) {
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
      message: 'Server Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.TEXT);
  }
}
