const admin = require('firebase-admin');

const serviceAccount = {
  "type": "service_account",
  "project_id": "dantewada-attedence",
  "private_key_id": "d8f2d47f21f5f7190336cc9d840e4fea35d2602a",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDns0tvD+gumNd4\n8tmD3iNlL7mvo1crbm31KDVWUc2QXjiVvOopPqtxwpfbEII7sq2Llqs/Zxb34CxF\nfTwhu1oJdBJ4UqW77YGILgqag8Td8tvzv1GPBeOrCkfRD4qx/IzzLh6PGjrLtobG\nLiR3BqbqcX8TvZWtp8ie88jeSDM4qHJI1+aZaVYJcjrwxDVuAxBAT9bAsdFdxuuu\nIhInwsVQ1Tc3rsFNOYfSRfC7zTKBk9387rVKIiqVEcEeWFjS/8GKGcM3VP4/A531\nfy5BdIgR1W+hOj8DWkOc5E0c7sZm+vcjWh0T2erI93o6fnW0pB4ofhEAgNuvzvv7\nyEz/QBNVAgMBAAECggEAB5G+7CDr5+HMYEImwv0V0O9vNIK0jVGtO+4VV/2SJp49\nYP7r8279sNi3l0uBxat/qejBLXATuwNSzu5ZcYyqU1a8Z7vjeDE5IxbF9+hIHSwa\n7WqZon+BwYuzbuwADvJ+NE+UZf5oX1FWM9E8Fbtc5pnQmfd+lU6+6hpyvHhFXBts\nvohdpOg73ajklm2tulOhH0v4XYJ13uLGlXgElk52NF6k/I4RJs9wbQFRMUxcZvTn\nMvVVdXG7zfN/aCZCQPw9cpIvF7dUcXeoBG0Pbi4o5YHA6A8QrdE9CJMcXgzsrkR3\nEm0hm+gUoVcmejJxbcub7sM17dP50z1qPv74Q/kjfQKBgQD1ekJLMdeaI1M0ncpI\nQXQ/HhaUxnX81kAzrwef0Hx3Sa/hzeQpEccYYJkeTYtpTHTfC2qNLdLgTXQAv8Xh\n1rtK2Ia0YO76uALmWtzDFDTVlhaSc0R1ez765uhrEmXWlUqF8QMWbPFy1SXwlLdt\nCSGrwvtB/4P7KVNcH3AMkDzH6wKBgQDxodoZhMJOgTuSiqoI6eodbalV42qoAgIt\nvnag7z4c55jqX723Vc0pNAHusfy1zJSDzXY8lWlTpNhMTxFmdJ2cgB3MuiEfSro7\nevBlSf6kS1yHHIGYpDcpZ+Mji+AEH4MVnmg9aSCaN//z525bgPAgFnU25+Owbqji\nLE+7Hp0BvwKBgQCba9sJbPdLGk6WI8ltUjPdupklfTo66RQhJRK4tvH3POplF0z8\nS8s4vgB0VTiNZOEiT0IZPQglCCUITGNnh+NxkgJHto/YoiUD4EeiI+sHyE1mUCDq\nGSxZA1XoZO+hm0hh4aTI0BVXVWj+F8rC+GMfMwaOVM8leJbU3vq8mZ5CHQKBgA08\ndnwLX7F5NtAyNFpEpgRyq2H/ESqe4Yur8Uejk111+lRsZjISyyhEpw5yRYuX51LJ\nAH8VGC3yy75yXluka7XU9szuLT5Pk6AKffyubvqE/k6QazD3XeYwwKqD0QOozj9y\n6/bhOV35T1YHCW6Nw5meYVFepoRVq36oOr3fUW51AoGASdDewVAdWicILy1nytLT\nAyiJD0F+xlhHLEm7e28pFU8acG+9BbW0uSJnhRUeHM1IFC0nH7YXi4PWpOswhJau\ndxq74Sl8Lvrb6JoLQAIeW7gw1WiFB3F8+6PPPXNas4ngzcGpsCzQCCbFG9utg/fq\nsCcG0A7lWC9pTnwrZznsk2c=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@dantewada-attedence.iam.gserviceaccount.com",
  "client_id": "105016779179926325350",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40dantewada-attedence.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

const initializeFirebase = () => {
    try {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('Firebase Admin Initialized');
        }
        return admin.firestore();
    } catch (error) {
        console.error('Firebase initialization error:', error);
        process.exit(1);
    }
};

const db = initializeFirebase();

module.exports = { db, admin };
