import React, { Component } from 'react';
import ReactDOM from 'react-dom'; 
import PropTypes from 'prop-types';
import Immutable, { fromJS } from 'immutable';
import _ from 'lodash';
import clipboard from 'clipboard-js';
import {Table, Column, Cell} from 'fixed-data-table-2';
import Autosize from './wrapper/auto.zise';
import RowIndex from './wrapper/row.index';
import ColumnHeader from './wrapper/column.header';
import CellAction from './wrapper/cell.action';
import validator from './wrapper/validator';
import AutoPosition from './wrapper/auto.position';
import ErrorBox from './wrapper/error.box';
import Menu from './wrapper/context.menu';
import Styles from './stylecomponent/index.css';
import 'fixed-data-table-2/dist/fixed-data-table.css';
import './css/index.css';
const ObjectUtil = require('./helpers/ObjectUtil');
const { TextCell, ColoredTextCell } = require('./helpers/cells');

class FlexiTable extends Component {
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

  componentWillMount () {
    window.addEventListener('mouseup', this._handleGlobalMouseUp);
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('paste', this._handlePaste);
    window.addEventListener('copy', this._handleCopy);
    window.addEventListener('cut', this._handleCut);
    window.addEventListener('beforecopy', this._preventDefault);
    window.addEventListener('click', this._handleBaseClick);
  }

  componentWillUnmount () {
    window.removeEventListener('mouseup', this._handleGlobalMouseUp);
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('paste', this._handlePaste);
    window.removeEventListener('copy', this._handleCopy);
    window.removeEventListener('cut', this._handleCut);
    window.removeEventListener('beforecopy', this._preventDefault);
    window.removeEventListener('click', this._handleBaseClick);
  }

  componentDidUpdate (prevProps, prevState) {
    const data = this.state.data;
    const previousData = this.__history[this.__historyIndex - 1];
    if (prevState.data !== data && previousData !== data){

      let foundChanges = false;
      for (let i = 0; i < data.size; i++){
        if (data.get(i).get('data') !== previousData.get(i).get('data')){
          foundChanges = true;
          break;
        }
      }

      if (!foundChanges) {
        return;
      }

      this.__history = this.__history.splice(0, this.__historyIndex );
      this.__history.push(this.state.data);
      this.__historyIndex = this.__history.length;
    }
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
    var styles = Object.assign({},Styles.FullSize,Styles.Sheet.base)
    return (
      <div
      ref='base'
      style={styles}
      tabIndex='0'>
      <Autosize>
      <Table
        rowHeight={50}
        headerHeight={50}
        rowsCount={this.state.dataList.getSize()}
        width={1300}
        height={500}
        onRowMouseDown={(event, rowIndex) => { this.handleRowMouseDown(rowIndex); }}
        onRowMouseUp={(event, rowIndex) => { this.handleRowMouseUp(rowIndex); }}
        {...this.props}>
        {this.state.columns}
      </Table>
      </Autosize>
      </div>
    );
  }
}

FlexiTable.propTypes = {
  defaultData: PropTypes.array,
  rowCount: PropTypes.number,
  columns: PropTypes.array.isRequired,
  rowValidator: PropTypes.func,
  getCellStyle: PropTypes.func,
  getRowHeaderStyle: PropTypes.func,
  getColumnHeaderStyle: PropTypes.func,
  getCellErrorStyle: PropTypes.func,
  rowHeight: PropTypes.number
};

FlexiTable.defaultProps = {
  defaultData: [],
  rowCount: 10,
  rowHeight: 32,
  columns:[]
};

export default FlexiTable;
