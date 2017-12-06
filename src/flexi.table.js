import React, { Component } from 'react';
import ReactDOM from 'react-dom'; 
import PropTypes from 'prop-types';
import Radium from 'radium';
import Immutable, { fromJS } from 'immutable';
import _ from 'lodash';
import clipboard from 'clipboard-js';
import {Table, Column} from 'fixed-data-table-2';
import Autosize from './wrapper/auto.zise';
import RowIndex from './wrapper/row.index';
import ColumnHeader from './wrapper/column.header';
import CellAction from './wrapper/cell.action';
import validator from './wrapper/validator';
import AutoPosition from './wrapper/auto.position';
import ErrorBox from './wrapper/error.box';
import Menu from './wrapper/context.menu';
import { inBetween, inBetweenArea, areaInBetweenArea, isInParent,
  ignoreKeyCodes, isCommand, isFirefox, isSafari } from './wrapper/helper';
import Styles from './stylecomponent';
import 'fixed-data-table-2/dist/fixed-data-table.css';
import './css/index.css';
//const ObjectUtil = require('./helpers/ObjectUtil');
//const { TextCell, ColoredTextCell } = require('./helpers/cells');

class FlexiTable extends Component {
  longClickTimer = null;
  

  constructor(props) {
    super(props);
    const columns = this.getInitialColumns(props);
    this.state = {
      columnWidthOverrides: {},
      columns,
      data: this.getInitialData(props, columns),
      selection: {},
      copySelection: {},
      showError: null,
      isCut: false
    };

    this.__dragging = {};

    this.__history = [];
    this.__history.push(this.state.data);
    this.__historyIndex = this.__history.length;
  }

  getInitialData = (props, columns) => {
    const maxRows = Math.max(props.defaultData.length, props.rowCount);
    let data = _.clone(props.defaultData);
    data[maxRows - 1] = data[maxRows - 1];
    data = data.fill({}, props.defaultData.length, maxRows)
                .map(d => { return { data: d }; });

    data = fromJS(data);
    data = this._dataWithErrors(props.rowValidator, columns, data);

    return data;
  }

  getInitialColumns = (props) => {
    return props.columns.map((column, i) => {
      const newColumn = {column, __index: i};
      return new Immutable.Map(newColumn);
    });
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

  /**
   * Internal Methods
   */
  _dataWithErrors = (rowValidator, columns, data) => {
    return data.map(row => {
      return row.set('errors', this._validateRow(rowValidator, columns, row));
    });
  }

  _validateRow (rowValidator, columns, row) {
    const errors = {};
    const rowData = row.get('data');

    //  No data
    if (rowData.size === 0){
      return errors;
    }

    //  Per column
    columns.forEach(column => {
      column = column.get('column');
      const error = validator(rowData, rowData.get(column.columnKey), column.required, column.options, column.validator);
      if (error) {
        errors[column.columnKey] = (column.label || column.columnKey) + ': ' + error;
      }
    });

    //  Per row
    if (rowValidator){
      const error = rowValidator(rowData);
      if (error) {
        errors.__row = error;
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  _getCurrentDataWithSelection (prevSel, sel, type='selection'){
    return this._getDataWithSelection(this.state.data, prevSel, sel, type);
  }

  _getDataWithSelection (data, prevSel, sel, type='selection') {
    return data.withMutations(d => {

      const doneMap = {}; //  cache for intersection

      //  Prev selection cells
      [prevSel, sel].forEach(curSel => {
        const startRow = Math.min(curSel.startRow, curSel.endRow);
        const endRow = Math.min(this.state.data.size - 1, Math.max(curSel.startRow, curSel.endRow) + 1);

        for (let i = startRow; i <= endRow; i++){
          if (doneMap[i]){
            continue;
          }

          const curData = d.get(i).set(type, sel);
          if (curData !== d.get(i)) {
            d.set(i, curData);
          }

          doneMap[i] = true;
        }
      });

    });
  }

  _getColumnsWithSelection (prevSel, sel) {
    return this.state.columns.map((column, i) => {

      const prevSelected = inBetween(i, prevSel.startCol, prevSel.endCol);
      const selected = inBetween(i, sel.startCol, sel.endCol);
      if (prevSelected !== selected){
        return column.set('__selected', selected);
      } else {
        return column;
      }
    });
  }

  _getRowIndexDataWithSelection (sel) {
    const allSelected = sel.startRow === 0 && sel.endRow === this.state.data.size - 1 &&
                          sel.startCol === 0 && sel.endCol === this.state.columns.length - 1;

    if (!this.state.rowIndexData || this.state.rowIndexData.__allSelected !== allSelected){
      return { __allSelected: allSelected };
    } else {
      return this.state.rowIndexData;
    }
  }

  _setSelectionPoint = (startRow, endRow, startCol, endCol, force) => {
    const prevSelection = this.state.selection;
    const selection = {
      startRow,
      endRow,
      startCol,
      endCol
    };

    if (_.isEqual(selection, this.state.selection) && !force){
      return;
    }

    const data = this._getCurrentDataWithSelection(prevSelection, selection);
    const columns = this._getColumnsWithSelection(prevSelection, selection);
    const rowIndexData = this._getRowIndexDataWithSelection(selection);

    this.setState({ selection, columns, rowIndexData, data });
  }

  _setSelectionObject (obj, force) {
    const sel = {};
    _.assign(sel, this.state.selection, obj);
    this._setSelectionPoint(sel.startRow, sel.endRow, sel.startCol, sel.endCol, force);
  }

  _setCopySelectionPoint = (startRow, endRow, startCol, endCol) => {
    const prevCopySelection = this.state.copySelection;
    const copySelection = {
      startRow: Math.min(startRow, endRow),
      endRow: Math.max(startRow, endRow),
      startCol: Math.min(startCol, endCol),
      endCol: Math.max(startCol, endCol)
    };

    if (_.isEqual(copySelection, this.state.copySelection)){
      return;
    }

    const data = this._getCurrentDataWithSelection(prevCopySelection, copySelection, 'copySelection');

    this.setState({ copySelection, data });
  }

  _setCopySelectionObject (obj) {
    const sel = {};
    _.assign(sel, this.state.copySelection, obj);
    this._setCopySelectionPoint(sel.startRow, sel.endRow, sel.startCol, sel.endCol);
  }

 

  _cellDataGetter = (rowIndex, cellKey, row) => {
    return row.get('data').get(cellKey);
  }

  _setEditing = (editing, data) => {
    return new Promise((resolve, reject) => {
      const sel = this.state.selection;
      if (editing !== !!this.state.editing){
        data = data || this.state.data;

        const prevSel = this.state.editing;
        if (prevSel) {
          const prevEditingRow = data.get(prevSel.startRow).delete('editing');
          data = data.set(prevSel.startRow, prevEditingRow);
        }

        let row = data.get(sel.startRow);
        if (editing) {
          row = row.set('editing', sel.startCol);
        } else {
          row = row.delete('editing');
        }
        data = data.set(sel.startRow, row);
      }

      this.setState({ editing: editing ? sel : null, data }, resolve);

      if (!editing) {
        setTimeout(this._focusBase, 0);
      }
    });
  }

  _focusBase = () => {
    ReactDOM.findDOMNode(this.refs.base).focus();
  }

  _focusDummy = () => {
    ReactDOM.findDOMNode(this.refs.dummy).select();
  }

  _dataToData (data) {
    if (data) {
      return data.map(d => { return new Immutable.Map({ data: d.get('data'), errors: d.get('errors')}); });
    } else {
      return data;
    }
  }

  _getSelectionFromChange (data, newData) {
    let selection = {};

    //  Check row
    for (let i = 0; i <= newData.size; i++){
      //  If start not found and row is different, it means startRow
      if (selection.startRow === undefined && newData.get(i) &&
          newData.get(i).get('data') !== data.get(i).get('data')) {
        selection.startRow = i;
      }

      //  If start found and row is same, or row not found, it means ended
      else if (selection.startRow !== undefined &&
               (!newData.get(i) || newData.get(i).get('data') === data.get(i).get('data'))) {
        selection.endRow = i - 1;
        break;
      }
    }

    //  Check column
    for (let i = selection.startRow; i <= selection.endRow; i++) {

      for (let j = 0; j <= this.state.columns.length; j++){
        const columnKey = this.state.columns[j] ? this.state.columns[j].get('column').columnKey : null;

        //  If start not found and col is different, it means startRow
        if ((selection.startCol === undefined || selection.startCol > j) && newData.get(i) &&
            newData.get(i).get('data').get(columnKey) !== data.get(i).get('data').get(columnKey)) {
          selection.startCol = j;
        }

        //  If start found and col is same, or col not found, it means ended
        else if (selection.startCol !== undefined && (selection.endCol === undefined || selection.endCol < j) &&
                 (!newData.get(i) || newData.get(i).get('data').get(columnKey) === data.get(i).get('data').get(columnKey))) {
          selection.endCol = j - 1;
          break;
        }
      }
    }

    return selection;
  }


  /**
   * Handlers
   */
  _preventDefault = (e) => {
    e.preventDefault();
  }

  _handleResizeColumn = (newColumnWidth, key) => {
    const columnWidthOverrides = {...this.state.columnWidthOverrides};
    columnWidthOverrides[key] = newColumnWidth;
    this.setState({ columnWidthOverrides });
  }

  _handleGlobalMouseDown = (type, selection, e) => {
    if (e.button === 2 && areaInBetweenArea(selection, this.state.selection)) {
      return;
    }

    if (this.state.editing) {
      setTimeout(() => {
        this.__dragging[type] = true;
        this._setSelectionObject(selection);
        //this._focusBase();
      }, 0);
    } else {
      this.__dragging[type] = true;
      this._setSelectionObject(selection);
      //this._focusBase();
    }
  }

  _handleRowIndexMouseOver = (type, selection, errors, e) => {
    const errorsArr = [];
    for (let key in errors) {
      errorsArr.push(errors[key]);
    }

    this._handleGlobalMouseOver(type, selection);

    if (errorsArr.length > 0){
      this._handleCellMouseEnter(errorsArr, e);
    }
  }

  _handleGlobalMouseOver = (type, selection) => {
    if (this.__dragging[type] && !this.state.editing) {
      this._setSelectionObject(selection);
    }
  }

  _handleGlobalMouseUp = () => {
    this.__dragging = {};
  }

  _handleSelectAll = () => {
    this._setSelectionPoint(0, Math.max(this.state.data.size, this.props.rowCount), 0, this.state.columns.length);
  }

  _handleDataUpdate (rowIndex, columnKey, value){
    let data = this.state.data;
    let row = data.get(rowIndex);

    let rowData = row.get('data');
    if (value){
      row = row.set('data', rowData.set(columnKey, value));
    } else {
      row = row.set('data', rowData.delete(columnKey));
    }

    //  Errors
    row = row.set('errors', this._validateRow(this.props.rowValidator, this.state.columns, row));

    data = data.set(rowIndex, row);
    this._setEditing(false, data).then(() => {
      this._setCopySelectionPoint(-1, -1, -1, -1);
    });
  }

  _handleKeyDown = (e) => {
    if (!isInParent(e.target, ReactDOM.findDOMNode(this.refs.base))){
      return;
    }

    //  Arrow events
    const sel = this.state.selection;
    const ctrl = (e.ctrlKey || e.metaKey);
    const editing = this.state.editing;

    if (e.keyCode === 38){
      e.preventDefault();
      if (e.shiftKey){
        this._setSelectionObject({ endRow: ctrl ? 0 : sel.endRow - 1 });
      } else {
        this._setSelectionPoint(sel.startRow - 1, sel.startRow - 1, sel.startCol, sel.startCol);
      }
    }
    else if (e.keyCode === 40){
      e.preventDefault();
      if (e.shiftKey){
        this._setSelectionObject({ endRow: ctrl ? this.props.rowCount : sel.endRow + 1 });
      } else {
        this._setSelectionPoint(sel.startRow + 1, sel.startRow + 1, sel.startCol, sel.startCol);
      }
    }
    else if (e.keyCode === 37 && !editing){
      e.preventDefault();
      if (e.shiftKey){
        this._setSelectionObject({ endCol: ctrl ? 0 : sel.endCol - 1 });
      } else {
        this._setSelectionPoint(sel.startRow, sel.startRow, sel.startCol - 1, sel.startCol - 1);
      }
    }
    else if (e.keyCode === 39 && !editing){
      e.preventDefault();
      if (e.shiftKey){
        this._setSelectionObject({ endCol: ctrl ? this.props.columns.length : sel.endCol + 1 });
      } else {
        this._setSelectionPoint(sel.startRow, sel.startRow, sel.startCol + 1, sel.startCol + 1);
      }
    }
    else if (e.keyCode === 13){
      e.preventDefault();
      this._setSelectionPoint(sel.startRow + 1, sel.startRow + 1, sel.startCol, sel.startCol);
    }
    else if (e.keyCode === 9){
      e.preventDefault();
      if (e.shiftKey){
        this._setSelectionPoint(sel.startRow, sel.startRow, sel.startCol - 1, sel.startCol - 1);
      } else {
        this._setSelectionPoint(sel.startRow, sel.startRow, sel.startCol + 1, sel.startCol + 1);
      }
    }
    else if (e.keyCode === 27 && editing){
      this._setEditing(false);
    }
    else if (e.keyCode === 27 && !editing){
       this._setCopySelectionPoint(-1, -1, -1, -1);
       this.setState({ isCut: false });
    }
    else if (!editing && (e.keyCode === 8 || e.keyCode === 46)){
      this._handleDelete(e);
    }
    else if (!editing && e.keyCode === 90 && ctrl){
      if (e.shiftKey) {
        this._handleRedo();
      } else {
        this._handleUndo();
      }
      e.preventDefault();
    }
    //  Copy and cut
    else if (ctrl && (e.keyCode === 67 || e.keyCode === 88) && !editing){
      if (isFirefox()){
        this._focusBase();
        //  Force a selection so firefox will trigger oncopy
        const selection = document.getSelection();
        const range = document.createRange();
        range.setStartBefore(ReactDOM.findDOMNode(this.refs.dummy));
        range.setEndAfter(ReactDOM.findDOMNode(this.refs.dummy));
        selection.addRange(range);
        setTimeout(() => {
          selection.removeAllRanges();
        });
      }
    }
    //  Paste
    else if (ctrl && e.keyCode === 86 && !editing){
      if (isFirefox()) {
        //  Force a selection so firefox will trigger onpaste
        this._focusDummy();
      }
    }
    //  Ctrl + A
    else if (ctrl && e.keyCode === 65) {
      this._handleSelectAll();
    }
    else if (!ignoreKeyCodes[e.keyCode] && !this.state.editing && !isCommand(e)){
      this._setEditing(true);
    }
    else if (ctrl && !isCommand(e)) {
      //  To focus on input for safari paste event
      if (isSafari()) {
        this._focusBase();
      }
    }
  }

  _handleDoubleClick = (e) => {
    this._setEditing(true);
  }

  _handleUndo = () => {
    if (this.__historyIndex > 1){
      this.__historyIndex--;
      let data = this.__history[this.__historyIndex - 1];
      data = this._dataToData(data);

      const oldData = this.state.data;
      this._setEditing(false, data).then(() => {
        this._setSelectionObject(this._getSelectionFromChange(oldData, data), true);
      });
    }
  }

  _handleRedo = () => {
    if (this.__historyIndex < this.__history.length){
      this.__historyIndex++;
      let data = this.__history[this.__historyIndex - 1];
      data = this._dataToData(data);

      const oldData = this.state.data;
      this._setEditing(false, data).then(() => {
        this._setSelectionObject(this._getSelectionFromChange(oldData, data), true);
      });
    }
  }

  _handleDelete = (e, selection) => {
    if (e){
      e.preventDefault();
    }

    let data = this.state.data;
    const sel = selection || this.state.selection;
    const columns = this.state.columns;

    for (let rowI = Math.min(sel.startRow, sel.endRow); rowI <= Math.max(sel.startRow, sel.endRow); rowI++){
      let row = data.get(rowI);
      let rowData = row.get('data');
      for (let colI = Math.min(sel.startCol, sel.endCol); colI <= Math.max(sel.startCol, sel.endCol); colI++){
        const columnKey = columns[colI].get('column').columnKey;
        rowData = rowData.delete(columnKey);
      }
      row = row.set('data', rowData);
      row = row.set('errors', this._validateRow(this.props.rowValidator, columns, row));
      data = data.set(rowI, row);
    }
    this.setState({ data });
  }

  _processCopy = () => {
    if (!isInParent(document.activeElement, ReactDOM.findDOMNode(this.refs.base)) ||
        this.state.editing){
      return null;
    }

    let data = [];
    const sel = this.state.selection;
    const startRow = Math.min(sel.startRow, sel.endRow);
    const endRow = Math.max(sel.startRow, sel.endRow);
    for (let row = startRow; row <= endRow; row++){
      const rowDataRaw = [];
      const rowData = this.state.data.get(row).get('data');

      const startCol = Math.min(sel.startCol, sel.endCol);
      const endCol = Math.max(sel.startCol, sel.endCol);
      for (let col = startCol; col <= endCol; col++){
        const columnKey = this.state.columns[col].get('column').columnKey;
        rowDataRaw.push(rowData.get(columnKey));
      }
      data.push(rowDataRaw.join('\t'));
    }

    this._setCopySelectionObject(sel);
    return data;
  }

  _handleMenuCopy = (e) => {
    let data = this._processCopy();
    if (data) {
      clipboard.copy(data);
    }
    this.setState({ isCut: false });
  }

  _handleMenuCut = (e) => {
    this._handleMenuCopy(e);
    this.setState({ isCut: true });
  }

  _handleCopy = (e) => {
    let data = this._processCopy();
    if (data) {
      e.clipboardData.setData('text/plain', data.join('\n'));
      e.preventDefault();
    }
    this.setState({ isCut: false });
  }

  _handleCut = (e) => {
    this._handleCopy(e);
    this.setState({ isCut: true });
  }

  _handlePaste = (e) => {
    if (!isInParent(document.activeElement, ReactDOM.findDOMNode(this.refs.base)) ||
        this.state.editing){
      return;
    }

    e.preventDefault();
    let text = (e.originalEvent || e).clipboardData.getData('text/plain');

    if (text.charCodeAt(text.length - 1) === 65279){
      text = text.substring(0, text.length - 1);
    }

    let rows = text.replace(/\r/g, '\n').split('\n');
    rows = rows.map(row => {
      return row.split('\t');
    });

    let data = this.state.data;
    const sel = this.state.selection;
    const isSingle = rows.length === 1 && rows[0] && rows[0].length === 1;

    const startRow = Math.min(sel.startRow, sel.endRow);
    const endRow = Math.max(sel.startRow, sel.endRow);
    const startCol = Math.min(sel.startCol, sel.endCol);
    const endCol = Math.max(sel.startCol, sel.endCol);

    //  If single cell
    if (isSingle){
      for (let rowI = startRow; rowI <= endRow; rowI++){
        let row = data.get(rowI);
        let rowData = row.get('data');
        for (let colI = startCol; colI <= endCol; colI++){
          const columnKey = this.props.columns[colI].columnKey;
          if (rows[0][0]){
            rowData = rowData.set(columnKey, rows[0][0]);
          } else {
            rowData = rowData.delete(columnKey);
          }
        }
        row = row.set('data', rowData);
        row = row.set('errors', this._validateRow(this.props.rowValidator, this.state.columns, row));
        data = data.set(rowI, row);
      }
    }

    //  If not single cell
    else {
      rows.forEach((r, i) => {
        i += startRow;

        //  Out of bound
        if (i >= this.props.rowCount){
          return;
        }

        let row = data.get(i);
        let rowData = row.get('data');
        r.forEach((value, j) => {
          j += startCol;

          //  Out of bound
          if (j >= this.props.columns.length){
            return;
          }

          const columnKey = this.props.columns[j].columnKey;
          if (value) {
            rowData = rowData.set(columnKey, value);
          } else {
            rowData = rowData.delete(columnKey);
          }
          row = row.set('data', rowData);
          row = row.set('errors', this._validateRow(this.props.rowValidator, this.state.columns, row));
          data = data.set(i, row);
        });
      });
    }

    //  Clear copy selection
    const copySelection = this.state.copySelection;
    data = this._getDataWithSelection(data, this.state.copySelection, {}, 'copySelection');

    this.setState({ data });
    if (!isSingle) {
      this._setSelectionPoint(startRow, startRow + rows.length - 1, startCol, startCol + rows[0].length - 1);
    }

    //  Clear data for cut area
    if (this.state.isCut) {
      this._handleDelete(null, copySelection);
      this.setState({ isCut: false });
    }
  }

  _handleCellMouseEnter = (errors, e) => {
    const cell = e.target.tagName === 'div' ? e.target : e.target.parentNode.parentNode;

    this.setState({
      showError: {
        errors: Array.isArray(errors) ? errors : [errors],
        boundingBox: cell.getBoundingClientRect()
      }
    });
  }

  _handleCellMouseLeave = () => {
    if (this.state.showError) {
      this.setState({ showError: null });
    }
  }

  _handleColumnContextMenu (column, e) {
    e.preventDefault();
    this.setState({
      columnMenu: {
        column,
        position: {left: e.clientX, top: e.clientY}
      }
    });
  }

  _handleRowContextMenu (row, isHeader, e) {
    e.preventDefault();
    this.setState({
      rowMenu: {
        row,
        position: {left: e.clientX, top: e.clientY},
        isHeader
      }
    });
  }

  _handleSelectionContextMenu = (e) => {
    e.preventDefault();
    this.setState({
      selectionMenu: {
        selection: this.state.selection,
        position: {left: e.clientX, top: e.clientY}
      }
    });
  }

  _handleBaseClick = (e) => {
    setTimeout(() => {
      //  Reset menus
      if (this.state.columnMenu){
        this.setState({ columnMenu: null });
      }
      if (this.state.rowMenu){
        this.setState({ rowMenu: null });
      }
      if (this.state.selectionMenu){
        this.setState({ selectionMenu: null });
      }
    }, 0);
  }

  _handleSort = (direction) => {

    const column = this.state.columnMenu.column;
    const columnKey = column.get('column').columnKey;

    let data = this.state.data;
    data = data.sort((a, b) => {
      const dataA = a.get('data').get(columnKey);
      const dataB = b.get('data').get(columnKey);

      if (!dataA && !dataB) {
        return b.get('data').size - a.get('data').size;
      }

      if (!dataA) {
        return 1;
      }

      if (!dataB) {
        return -1;
      }

      return dataB > dataA ? -direction : direction;
    });

    this.setState({ data });
  }

  _handleDeleteRow = () => {
    const selection = this.state.selection;
    let data = this.state.data;

    data = data.splice(selection.startRow, selection.endRow - selection.startRow + 1);

    this.setState({ data }, () => {
      this._setSelectionPoint(-1, -1, -1, -1);
    });
  }

  _handleInsertRow = (startRow, amount) => {
    let data = this.state.data;

    const newRows = [];
    for (let i = 0; i < amount; i++) {
      let row = new Immutable.Map({data: new Immutable.Map({})});
      const errors = this._validateRow(this.props.rowValidator, this.state.columns, row);
      if (errors.length > 0){
        row = row.set('errors', errors);
      }
      newRows.push(row);
    }

    data = data.splice(startRow, 0, ...newRows);

    this.setState({ data }, () => {
      this._setSelectionPoint(startRow, startRow + amount - 1, 0, this.state.columns.size);
    });
  }

  /**
   * Rendering
   */
  __indexHeaderRenderer = (column, rowIndex, cellKey, width, height) => {
    return (
      <RowIndex
        selected={ column.__allSelected }
        getStyle={ this.props.getRowHeaderStyle }
        onMouseDown={ this._handleSelectAll }
        onContextMenu={ this._handleRowContextMenu.bind(this, column, true) } />
    );
  }

  

  __indexRenderer = (column, rowIndex, cellKey, row, width, height) => {
    const selected = inBetween(rowIndex,
                        this.state.selection.startRow,
                        this.state.selection.endRow);

     return (
      <RowIndex
        index={ rowIndex }
        selected={ selected }
        errors={ row.get('errors') }
        getStyle={ this.props.getRowHeaderStyle }
        onMouseDown={ this._handleGlobalMouseDown.bind(this, 'row', {
          startRow: rowIndex,
          endRow: rowIndex,
          startCol: 0,
          endCol: this.state.columns.length - 1
        }) }
        onMouseEnter={ this._handleRowIndexMouseOver.bind(this, 'row', {
          endRow: rowIndex
        }, row.get('errors')) }
        onMouseLeave={ this._handleCellMouseLeave }
        onContextMenu={ this._handleRowContextMenu.bind(this, column, false) } />
    );
  }

  _headerRenderer = (column, cellKey, height, width) => {
    return (
      <ColumnHeader
        column={ column.get('column') }
        selected={ column.get('__selected') }
        getStyle={ this.props.getColumnHeaderStyle }
        onMouseDown={this._handleGlobalMouseDown.bind(this, 'column', {
          startRow: 0,
          endRow: this.state.data.size - 1,
          startCol: column.get('__index'),
          endCol: column.get('__index')
        }) }
        onMouseEnter={ this._handleGlobalMouseOver.bind(this, 'column', {
          endCol: column.get('__index')
        }) }
        onContextMenu={ this._handleColumnContextMenu.bind(this, column) } />
    );
  }


  _cellRenderer = (cellKey, row, rowIndex, column, width, cellData) => {
    const columnData = column.get('column');
    const columnIndex = column.get('__index');
    const sel = row.get('selection') || {};
    const copySel = row.get('copySelection') || {};

    //  Selection
    const focused = sel.startRow === rowIndex && sel.startCol === columnIndex;
    const selected = inBetweenArea(rowIndex, columnIndex, sel.startRow, sel.endRow, sel.startCol, sel.endCol);

    const prevRowFocused = (sel.startRow === rowIndex - 1) && (sel.startCol === columnIndex);
    const prevRowSelected = inBetweenArea(rowIndex - 1, columnIndex, sel.startRow, sel.endRow, sel.startCol, sel.endCol);
    const hasPrevRow = (prevRowSelected && (Math.max(sel.startRow, sel.endRow) === rowIndex - 1)) || prevRowFocused;

    const prevColumnFocused = (sel.startRow === rowIndex) && (sel.startCol === columnIndex - 1);
    const prevColumnSelected = inBetweenArea(rowIndex, columnIndex - 1, sel.startRow, sel.endRow, sel.startCol, sel.endCol);
    const hasPrevColumn = (prevColumnSelected && (Math.max(sel.startCol, sel.endCol) === columnIndex - 1)) || prevColumnFocused;

    const isLeft = Math.min(sel.startCol, sel.endCol) === columnIndex;
    const isRight = Math.max(sel.startCol, sel.endCol) === columnIndex;
    const isTop = Math.min(sel.startRow, sel.endRow) === rowIndex;
    const isBottom = Math.max(sel.startRow, sel.endRow) === rowIndex;

    //  Errors
    const errors = row.get('errors') || {};

    //  Editing
    const editing = row.get('editing') === columnIndex && focused;

    //  Copy selection
    const copySelectedRow = inBetween(rowIndex, copySel.startRow, copySel.endRow);
    const copySelectedCol = inBetween(columnIndex, copySel.startCol, copySel.endCol);
    const isCopyLeft = Math.min(copySel.startCol, copySel.endCol) === columnIndex;
    const isCopyRight = Math.max(copySel.startCol, copySel.endCol) === columnIndex;
    const isCopyTop = Math.min(copySel.startRow, copySel.endRow) === rowIndex;
    const isCopyBottom = Math.max(copySel.startRow, copySel.endRow) === rowIndex;

    //  Return cell
    return (
      <CellAction
        data={ (!editing && columnData.formatter) ? columnData.formatter(cellData) : cellData }
        rowData={ row.get('data') }
        editing={ editing }
        focused={ focused }
        selected={ selected }
        hasPrevRow={ hasPrevRow }
        hasPrevColumn={ hasPrevColumn }
        isLeft={ isLeft }
        isRight={ isRight }
        isTop={ isTop }
        isBottom={ isBottom }
        error={ errors[cellKey] }

        isCopyLeft={ isCopyLeft && copySelectedRow }
        isCopyRight={ isCopyRight && copySelectedRow }
        isCopyTop={ isCopyTop && copySelectedCol }
        isCopyBottom={ isCopyBottom && copySelectedCol }

        column={ columnData }
        selection={ sel }
        rowIndex={ rowIndex }
        columnIndex={ columnIndex }

        getStyle={ this.props.getCellStyle }
        onUpdate={ this._handleDataUpdate.bind(this, rowIndex, cellKey) }

        onMouseDown={this._handleGlobalMouseDown.bind(this, 'cell', {
          startRow: rowIndex,
          endRow: rowIndex,
          startCol: column.get('__index'),
          endCol: column.get('__index')
        }) }
        onMouseOver={this._handleGlobalMouseOver.bind(this, 'cell', {
          endRow: rowIndex,
          endCol: column.get('__index')
        }) }
        onMouseEnter={ errors[cellKey] ? this._handleCellMouseEnter.bind(this, errors[cellKey]) : null }
        onMouseLeave={ this._handleCellMouseLeave }
        onDoubleClick={this._handleDoubleClick}
        onContextMenu={ this._handleSelectionContextMenu } />
    );
  }

  getColumns(props) {
    let columns = [];

    columns.push(
      <Column
        key='___index'
        columnKey='___index'
        columnData={this.state.rowIndexData}
        width={10 + 14 * ( this.state.data.size + '').length }
        header={ cell => this.__indexHeaderRenderer(this.state.columns[0], cell.rowIndex, cell.columnKey,this.state.data.get(0)) }
        cell={cell => this.__indexRenderer(this.state.columns[0],cell.rowIndex, cell.columnKey,this.state.data.get(0))}
        fixed={true} />
    );
    this.state.columns.forEach((column, i) => {
      const columnData = column.get('column');
      columnData.columnData = column;
      columnData.cell = (cell) =>  this._cellRenderer(cell.columnKey, this.state.data.get(i), cell.rowIndex, this.state.columns[0], cell.width);
      columnData.header = (cell) => this._headerRenderer(this.state.columns[i], cell.columnKey, cell.height, cell.width);
      columnData.width = this.state.columnWidthOverrides[columnData.columnKey] || columnData.width || 150;
      columnData.allowCellsRecycling = false;
      columnData.isResizable = true;

      //  Last column fills up all the remaining width
      if (i === this.state.columns.length - 1){
        columnData.flexGrow = 1;
      }

      columns.push(
        <Column
          { ...columnData }
         // cell={cell => {this.state.data.get(cell.rowIndex).get(cell.columnKey)}}
          //cell={cell => this._cellDataGetter(cell.rowIndex, cell.columnKey, this.state.data.get(0))}
          key={ columnData.columnKey }
          />
      );
    });


    // this.state.columns.forEach(column => {
    //   console.log('column',column);
    //   columns.push(
    //     <Column
    //       key={column.columnKey}
    //       columnKey='___index'
    //       //columnKey={column.columnKey}
    //       flexGrow={2}
    //       header={<Cell>{column.label}</Cell>}
    //       cell={cell => this.getCell(cell.rowIndex, cell.columnKey)}
    //       width={10 + 14 * ( this.state.data.size + '').length }
    //       fixed={true}
    //     />);
    // });
    return columns;
  }
 
  // getCell(rowIndex, columnKey) {
  //   let isCellHighlighted = this.state.longPressedRowIndex === rowIndex;
      
  //   let rowStyle = {
  //     backgroundColor: isCellHighlighted ? 'yellow' : 'transparent',
  //     width: '100%',
  //     height: '100%'
  //   } 
   
  //   return <TextCell style={rowStyle}
  //     data={this.state.data}
  //     rowIndex={rowIndex}
  //     columnKey={columnKey}
  //     columnKey={columnKey} />;
  // }

  // getSize() {
  //   return this.size;
  // }

  _getErrorPopover () {
    const showError = this.state.showError;
    if (!showError) {
      return null;
    }

    return (
      <AutoPosition
        anchorBox={ showError.boundingBox } >
        <ErrorBox errors={ showError.errors } getStyle={ this.props.getCellErrorStyle }/>
      </AutoPosition>
    );
  }

  _getColumnMenu () {
    if (!this.state.columnMenu) {
      return null;
    }

    const columnMenu = this.state.columnMenu;

    return (
      <AutoPosition
        anchorBox={ {left: columnMenu.position.left, top: columnMenu.position.top} } >
        <Menu items={[
            {label: 'Sort Asc', onClick: this._handleSort.bind(this, 1) },
            {label: 'Sort Desc', onClick: this._handleSort.bind(this, -1) },
            {label: 'Copy', onClick: this._handleMenuCopy },
            {label: 'Cut', onClick: this._handleMenuCut },
            {label: 'Clear', onClick: this._handleDelete }
          ]} />
      </AutoPosition>
    );
  }

  _getRowMenu () {
    if (!this.state.rowMenu) {
      return null;
    }

    const rowMenu = this.state.rowMenu;
    const isHeader = rowMenu.isHeader;

    const selection = this.state.selection;
    const startRow = Math.min(selection.startRow, selection.endRow);
    const endRow = Math.max(selection.startRow, selection.endRow);
    const rowCount = endRow - startRow + 1;

    return (
      <AutoPosition
        anchorBox={ {left: rowMenu.position.left, top: rowMenu.position.top} } >
        <Menu items={[
            isHeader ? null : {label: 'Insert ' + rowCount + ' above', onClick: this._handleInsertRow.bind(this, startRow, rowCount)},
            isHeader ? null : {label: 'Insert ' + rowCount + ' below', onClick: this._handleInsertRow.bind(this, endRow + 1, rowCount)},
            isHeader ? null : {label: 'Delete ' + rowCount + ' row', onClick: this._handleDeleteRow},
            {label: 'Copy', onClick: this._handleMenuCopy },
            {label: 'Cut', onClick: this._handleMenuCut },
            {label: 'Clear', onClick: this._handleDelete }
          ]} />
      </AutoPosition>
    );
  }

  _getSelectionMenu () {
    if (!this.state.selectionMenu) {
      return null;
    }

    const selectionMenu = this.state.selectionMenu;

    return (
      <AutoPosition
        anchorBox={ {left: selectionMenu.position.left, top: selectionMenu.position.top} } >
        <Menu items={[
            {label: 'Copy', onClick: this._handleMenuCopy },
            {label: 'Cut', onClick: this._handleMenuCut },
            {label: 'Clear', onClick: this._handleDelete }
          ]} />
      </AutoPosition>
    );
  }
  rowGetter = (i) => {
    console.log('sssss',this.state.data.get(i))
    return this.state.data.get(i);
  }
  render() {
    return (
      <div
      ref='base'
      style={ [
        Styles.FullSize,
        Styles.Sheet.base
      ] }
      tabIndex='0'>
      <Autosize>
      <Table
        rowGetter={this.rowGetter}
        rowsCount={this.state.data.size}
        onColumnResizeEndCallback={ this._handleResizeColumn }
        isColumnResizing={ false }
        rowHeight={ this.props.rowHeight }
        headerHeight={ this.props.rowHeight }
        width={ 0 }
        height={ 0 } 
        >
        {this.getColumns()}
      </Table>
      </Autosize>
        <input
          ref='dummy'
          type='text'
          style={{display: 'none'}}
          onFocus={ this._preventDefault } />
        { this._getErrorPopover() }
        { this._getColumnMenu() }
        { this._getRowMenu() }
        { this._getSelectionMenu() }

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

export default Radium(FlexiTable);
