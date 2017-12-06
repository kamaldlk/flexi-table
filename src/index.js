import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import FlexiTable from './flexi.table';
// var data = {
//   "Columns": [
//     {
//       "key": "Id",
//       "name": "Id",
//       "width": 80,
//       "resizable": true,  
//       "locked": true
//     },
//     {
//       "key": "task",
//       "name": "Title",
//       "editable": true,
//       "resizable": true,
//       "width": 100,
//       "locked": true
//     },
//     {
//       "key": "priority",
//       "name": "Priority",
//       "formatter": "ColorFormatter",
//       "editor": "ColorPicker",
//       "editable": true,
//       "resizable": true,
//       "width": 125
//     },
//     {
//       "key": "issueType",
//       "name": "Issue Type",
//       "editor": "Chips",
//       "formatter": "ChipsFormatter",
//       "editable": true,
//       "resizable": true,
//       "width": 150
//     },
//     {
//       "key": "taskInfo",
//       "name": "Task info",
//       "formatter": "JsonFormatter",
//       "width": 400,
//       "resizable": true,
//       "hidden":true
//     },
//     {
//       "key": "complete",
//       "name": "% Complete",
//       "editable": true,
//       "editor": "Sliders",
//       "resizable": true,
//       "width": 200
//     },
//     {
//       "key": "startDate",
//       "name": "Start Date",
//       "editable": true,
//       "editor": "Date",
//       "resizable": true,
//       "width": 300
//     },
//     {
//       "key": "completeDate",
//       "name": "Expected Complete",
//       "editable": true,
//       "editor": "Date",
//       "resizable": true,
//       "width": 300
//     },
//     {
//       "key": "notes",
//       "name": "Task notes",
//       "editable": true,
//       "editor": "TextArea",
//       "resizable": true,
//       "width": 300
//     }
//   ],
//   "Rows": [
//     {
//       "Id": 1,
//       "priority": "OrangeRed",
//       "issueType": 'ss',
//       "task": "Task 1",
//       "complete": 100,
//       "taskInfo": 'ssss',
//       "startDate": "Sun May 08 2016 13:59:24 GMT+0530 (IST)",
//       "completeDate": "Fri Jun 24 2016 17:54:05 GMT+0530 (IST)",
//       "notes": ""
//     }],
   
//   };

var columns = [
  { name: 'ID Number', columnKey: 'id_no', required: false, fixed: true },
  { name: 'Employee Name', columnKey: 'name', required: false, fixed: true, width: 150 },
  { name: 'Job Title', columnKey: 'jobTitle'},
  { name: 'Email Address', columnKey: 'email'} ,
  { name: 'Salary', columnKey: 'salary' }
];

var rows = [{name: 'John', jobTitle: 'bos'}, {name: 'Zebra', email: 'sam', salary: 500}, {name: 'Ali'}];
var rowCount = 10;

ReactDOM.render(<FlexiTable columns={columns} defaultData={rows} rowCount={rowCount} />, document.getElementById('root'));
