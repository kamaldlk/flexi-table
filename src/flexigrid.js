import React, { Component } from 'react';
import Immutable, { fromJS } from 'immutable';
import _ from 'lodash';
import {Table, Column, Cell} from 'fixed-data-table-2';
import 'fixed-data-table-2/dist/fixed-data-table.css';

const ObjectUtil = require('./helpers/ObjectUtil');
const { TextCell, ColoredTextCell } = require('./helpers/cells');

class Flexigrid extends Component {
  longClickTimer = null;
  data = {
    "Columns": [
      {
        "key": "Id",
        "name": "Id",
        "width": 80,
        "resizable": true,
        "locked": true
      },
      {
        "key": "task",
        "name": "Title",
        "editable": true,
        "resizable": true,
        "width": 100,
        "locked": true
      },
      {
        "key": "priority",
        "name": "Priority",
        "formatter": "ColorFormatter",
        "editor": "ColorPicker",
        "editable": true,
        "resizable": true,
        "width": 125
      },
      {
        "key": "issueType",
        "name": "Issue Type",
        "editor": "Chips",
        "formatter": "ChipsFormatter",
        "editable": true,
        "resizable": true,
        "width": 150
      },
      {
        "key": "taskInfo",
        "name": "Task info",
        "formatter": "JsonFormatter",
        "width": 400,
        "resizable": true,
        "hidden":true
      },
      {
        "key": "complete",
        "name": "% Complete",
        "editable": true,
        "editor": "Sliders",
        "resizable": true,
        "width": 200
      },
      {
        "key": "startDate",
        "name": "Start Date",
        "editable": true,
        "editor": "Date",
        "resizable": true,
        "width": 300
      },
      {
        "key": "completeDate",
        "name": "Expected Complete",
        "editable": true,
        "editor": "Date",
        "resizable": true,
        "width": 300
      },
      {
        "key": "notes",
        "name": "Task notes",
        "editable": true,
        "editor": "TextArea",
        "resizable": true,
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

  constructor(props) {
    super(props);
    var dataList = new ObjectUtil(this.data);
    this.state = {
      dataList,
      columns: this.getColumns(),
      longPressedRowIndex: -1,
    };
  }

  handleRowMouseDown(rowIndex) {
    this.cancelLongClick();
    this.longClickTimer = setTimeout(() => {
      this.setState({
        longPressedRowIndex: rowIndex
      });
    }, 1000);
  }

  handleRowMouseUp() {
    this.cancelLongClick();
  }

  cancelLongClick() {
    if (this.longClickTimer) {
      clearTimeout(this.longClickTimer);
      this.longClickTimer = null;
    }
  }

  getColumns() {
    let columns = [];
    this.data.Columns.forEach(column => {
      console.log('column',column);
      columns.push(
        <Column
          key={column.key}
          columnKey={column.key}
          flexGrow={2}
          header={<Cell>{column.name}</Cell>}
          cell={cell => this.getCell(cell.rowIndex, cell.columnKey)}
          width={100}
        />);
    });
    return columns;
  }

  getCell(rowIndex, columnKey) {
    let isCellHighlighted = this.state.longPressedRowIndex === rowIndex;
      
    let rowStyle = {
      backgroundColor: isCellHighlighted ? 'yellow' : 'transparent',
      width: '100%',
      height: '100%'
    } 

    return <TextCell style={rowStyle}
      data={this.state.dataList}
      rowIndex={rowIndex}
      columnKey={columnKey} />;
  }

  getSize() {
    return this.size;
  }

  render() {
    return (
      <Table
        rowHeight={50}
        headerHeight={50}
        rowsCount={this.state.dataList.getSize()}
        width={1000}
        height={500}
        onRowMouseDown={(event, rowIndex) => { this.handleRowMouseDown(rowIndex); }}
        onRowMouseUp={(event, rowIndex) => { this.handleRowMouseUp(rowIndex); }}
        {...this.props}>
        {this.state.columns}
      </Table>
    );
  }
}

export default Flexigrid;
