import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import FlexiTable from './flexi.table';
var data = {
  "Columns": [
    {
      "columnKey": "Id",
      "name": "Id",
      "width": 80,
      "fixed": true
    },
    {
      "columnKey": "task",
      "name": "Title",
      "width": 100,
      "fixed": true
    },
    {
      "columnKey": "priority",
      "name": "Priority",
      "width": 125
    },
    {
      "columnKey": "issueType",
      "name": "Issue Type",
      "editor": "Chips",
      "width": 150
    },
    {
      "columnKey": "taskInfo",
      "name": "Task info",
      "width": 400,
      "hidden":true
    },
    {
      "columnKey": "complete",
      "name": "% Complete",
      "editor": "Sliders",
      "width": 200
    },
    {
      "columnKey": "startDate",
      "name": "Start Date",
      "editor": "Date",
      "width": 300
    },
    {
      "columnKey": "completeDate",
      "name": "Expected Complete",
      "editor": "Date",
      "width": 300
    },
    {
      "columnKey": "notes",
      "name": "Task notes",
      "editor": "TextArea",
      "width": 300
    }
  ],
  "Rows": [
    {
      "Id": 1,
      "priority": "OrangeRed",
      "issueType": 'ss',
      "task": "Task 1",
      "complete": 100,
      "taskInfo": 'ssss',
      "startDate": "Sun May 08 2016 13:59:24 GMT+0530 (IST)",
      "completeDate": "Fri Jun 24 2016 17:54:05 GMT+0530 (IST)",
      "notes": ""
    }],
   
  };
var rowCount = 10;
ReactDOM.render(<FlexiTable columns={data.Columns} defaultData={data.Rows} rowCount={rowCount} />, document.getElementById('root'));
