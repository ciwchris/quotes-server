const azure = require('azure-storage');
const async = require('async');
const webpush = require('web-push');

module.exports = function (context, myTimer) {
    var timeStamp = new Date().toISOString();
    context.log('Sending quote: ' + timeStamp);
    const quotesTable = 'quotes';
    const subscriptionsTable = 'subscriptions';

    var tableSvc = azure.createTableService();
    var query = new azure.TableQuery()
        .select(['text'])
        .take(1)
        .where('PartitionKey eq ?', 'quotes');
    tableSvc.queryEntities(quotesTable, query, null, function(error, result, response) {
        if (error) {
            context.done(null, {status: 500, body: JSON.stringify(error)})
        } else {
            var entries = result.entries.map(quote => {return {
                    text: quote.text._,
            }});

            const options = {
                vapidDetails: {
                    subject: 'https://random-quote.azurewebsites.net/api/WebPushNotify',
                    publicKey: 'BGPwmeJvcajyK7v-H3_tdESj9VwLpbO_I4oYrI4rnPlWERU2LGtrlD25oxGZ7vf0D8rJO4M0crHQ2SbhvCelahs',
                    privateKey: '1t8vQEtqkmy34wtmede8yt8wlMPfOcISj9QZBM-cJmU'
                },
                // 1 day in seconds
                TTL: 60 * 60 * 24
            };

            const payload = {"notification": {
                "title": "Random quote",
                "body": quote,
                //"icon": "https://ciwchris.github.io/rss-reader-ng-client/assets/images/icons/icon-192x192.png",
                //"badge": "https://ciwchris.github.io/rss-reader-ng-client/assets/images/icons/badge.png",
                "requireInteraction": true}
            };

            var query = new azure.TableQuery().select(['subscription']);
            tableSvc.queryEntities(table, query, null, function(error, result, response) {
                if(error){
                    context.done(null, {status: 500, body: 'Error retrieving subscription: ' + JSON.stringify(error)})
                }

                async.parallel(
                result.entries.map(entry => function (callback) {
                    webpush.sendNotification(
                        JSON.parse(entry.subscription._),
                        JSON.stringify(payload),
                        options
                    )
                    .then(() => {
                        callback(null, 'sent');
                    });
                }),
                function(error, results) {
                    if (error) {
                        context.done(null, {status: 500, body: 'error: ' + err.body})
                    } else {
                        context.done(null, {body: 'Sent results: ' + JSON.stringify(results)})
                    }
                });
            });
        }

    });
};
