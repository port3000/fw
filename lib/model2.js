'use strict';

module.exports = {

    model: {

        connection: '<%= connection %>',

        tableName: '<%= tableName %>',

        primaryKey: <%= primaryKey %>,

        uniKeys: <%= uniKeys %>,

        requiredKeys: <%= requiredKeys %>,

        get fields() { 
        	return Object.keys(this.columns); 
        },

        columns: <%= columns %>
    },


};
