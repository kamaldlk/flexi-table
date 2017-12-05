import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import tinycolor from 'tinycolor2';
import Styles from '../stylecomponent/index.css';
import { isEqualObject } from './helper';

class CellAction extends React.Component {

  /*
    Lifecycle
   */
  constructor (props) {
    super(props);
    this.state = {
      data: props.data
    };

  }

  componentWillReceiveProps (nextProps) {
    const startingEdit = (!this.props.editing && nextProps.editing);
    if (startingEdit) {
      this.setState({
        data: nextProps.data
      }, () => {
        this._focusInput();
      });
    }
  }

  /**
   * Internal Methods
   */
  _focusInput = () => {
    const node = ReactDOM.findDOMNode(this.refs.input);
    if (node){
      node.focus();
      node.setSelectionRange(0, node.value.length);
    }
  }

  _commitEdit = () => {
    this.props.onUpdate(this.state.data);
  }

  _revert = () => {
    this.setState({data: this.props.data});
  }

  _getEdges (sel, selected, focused) {
    return {
      left: selected && this.props.isLeft || focused,
      right: selected && this.props.isRight || focused,
      top: selected && this.props.isTop || focused,
      bottom: selected && this.props.isBottom || focused
    };
  }

  /**
   * Handlers
   */
  _handleKeyDown = (e) => {
    //  Enter, Tab, Up, Down
    if (e.keyCode === 13 || e.keyCode === 9 || e.keyCode === 38 || e.keyCode === 40) {
      this._commitEdit();
    } else if (e.keyCode === 27){
      this._revert();
    }
  }

  _handleChange = (e) => {
    this.setState({ data: e.target.value });
  }

  _handleOptions = (e) => {
    this.props.onUpdate(e.target.value, false);
  }

  _handleOptionsClick = (e) => {
    ReactDOM.findDOMNode(this.refs.select).click();
  }

  _handleSelect = (hover) => {
    this.setState({ hoverOptions: hover });
  }

  _preventDefault = (e) => {
    e.preventDefault();
  }

  _stopPropagation = (e) => {
    e.stopPropagation();
  }

  _handleBlur = (e) => {
    if (this.props.editing) {
      this._commitEdit();
    }
  }




  /*
    Render
   */
  _getOptions () {
    const options = this.props.column.options.map((option, i) => {
      return (
        <option
          key={option}
          value={option}>
          {option}
        </option>
      );
    });

    options.unshift(<option key=' ' value=' ' disabled>Choose below</option>);
    return options;
  }

  _getSelect () {
    if (this.props.column.options){
      return (
        <div style={ [Styles.Unselectable] }>
          <div
            style={ [Styles.CellAction.arrow, this.state.hoverOptions ? {opacity: 0.5} : null] }>▼</div>
          <select
            ref='select'
            style={ [Styles.CellAction.select] }
            value={' '}
            onChange={ this._handleOptions }
            onMouseEnter={ this._handleSelect.bind(this, true) }
            onMouseLeave={ this._handleSelect.bind(this, false) } >
            { this._getOptions() }
          </select>
        </div>
      );
    }
  }

  getStyle () {
    const sel = this.props.selection;
    const editing = this.props.editing;
    const focused = this.props.focused;
    const selected = this.props.selected;
    const hasPrevRow = this.props.hasPrevRow;
    const hasPrevColumn = this.props.hasPrevColumn;
    const error = this.props.error;

    const styles = [Styles.CellAction.inputField];

    if (!editing) {
      styles.push(Styles.Unselectable);
      styles.push({pointerEvents: 'none'});
    }

    //  Background color
    const highlightFactor = 0.2;
    let background;
    if (selected && error) {
      background = tinycolor.mix(tinycolor(Styles.Colors.danger), tinycolor(Styles.Colors.primary), 30);
    } else if (error) {
      background = tinycolor(Styles.Colors.danger);
    } else if (selected) {
      background = tinycolor(Styles.Colors.primary);
    }

    if (editing && background){
      background = tinycolor(Styles.Colors.white);
    }

    if (background){
      styles.push({
        background: background.setAlpha(highlightFactor).toRgbString()
      });
    }

    //  Copy Edges
    const copyColor = Styles.Colors.primary;
    if (this.props.isCopyLeft){
      styles.push({paddingLeft: (6 + 1 - 1) + 'px', borderLeftWidth: '1px', borderLeftColor: copyColor, borderLeftStyle: 'dashed'});
    }
    if (this.props.isCopyRight){
      styles.push({paddingRight: (6 - 1) + 'px', borderRightWidth: '1px', borderRightColor: copyColor, borderRightStyle: 'dashed'});
    }
    if (this.props.isCopyTop){
      styles.push({paddingTop: (4 + 1 - 1) + 'px', borderTopWidth: '1px', borderTopColor: copyColor, borderTopStyle: 'dashed'});
    }
    if (this.props.isCopyBottom){
      styles.push({paddingBottom: (4 - 1) + 'px', borderBottomWidth: '1px', borderBottomColor: copyColor, borderBottomStyle: 'dashed'});
    }

    //  Selection Edges
    const edges = this._getEdges(sel, selected, focused);
    const px = focused ? 2 : 1;
    const color = Styles.Colors.primary;

    if (edges.left){
      styles.push({paddingLeft: (6 + 1 - px) + 'px', borderLeftWidth: px + 'px', borderLeftColor: color});
    }
    if (edges.right){
      styles.push({paddingRight: (6 - px) + 'px', borderRightWidth: px + 'px', borderRightColor: color});
    }
    if (edges.top){
      styles.push({paddingTop: (4 + 1 - px) + 'px', borderTopWidth: px + 'px', borderTopColor: color});
    }
    if (edges.bottom){
      styles.push({paddingBottom: (4 - px) + 'px', borderBottomWidth: px + 'px', borderBottomColor: color});
    }

    //  Previous edges
    if (hasPrevRow){
      styles.push({paddingTop: (4 + 1) + 'px', borderTopWidth: 0 + 'px'});
    }
    if (hasPrevColumn){
      styles.push({paddingLeft: (6 + 1) + 'px', borderLeftWidth: 0 + 'px'});
    }

    //  Final style before customisation
    return this.props.getStyle ?
      this.props.getStyle(this.props.data,
                          this.props.rowData,
                          this.props.column,
                          { selected, focused, editing, error, selection: sel },
                          styles)
      : styles;
  }


  /**
   * Rendering
   */
  shouldComponentUpdate (nextProps, nextState) {
    //return true;
    const ignoreKeys = {selection: true};
    if (!isEqualObject(this.props, nextProps, ignoreKeys) ||
        !isEqualObject(this.state, nextState)){
      return true;
    }
    return false;
  }

  render () {
    return (
      <div
        style={ [Styles.Stretch, Styles.Unselectable] }
        onDrag={ this._preventDefault }
        onMouseDown={ this.props.onMouseDown }
        onMouseOver={ this.props.onMouseOver }
        onMouseEnter = { this.props.onMouseEnter }
        onMouseLeave = { this.props.onMouseLeave }
        onDoubleClick={ this.props.onDoubleClick }
        onContextMenu={ this.props.onContextMenu } >
        <input
          ref='input'
          type='text'
          style={ this.getStyle() }
          value={ this.props.editing ? this.state.data : this.props.data }
          onKeyDown={ this._handleKeyDown }
          onChange={ this._handleChange }
          onBlur={ this._handleBlur } />
        { this._getSelect() }
      </div>
    );
  }
}

CellAction.propTypes = {
  data: PropTypes.any,
  rowData: PropTypes.object,
  selected: PropTypes.bool,
  focused: PropTypes.bool,
  hasPrevRow: PropTypes.bool,
  hasPrevColumn: PropTypes.bool,
  isLeft: PropTypes.bool,
  isRight: PropTypes.bool,
  isTop: PropTypes.bool,
  isBottom: PropTypes.bool,
  editing: PropTypes.bool,
  error: PropTypes.string,

  isCopyLeft: PropTypes.bool,
  isCopyRight: PropTypes.bool,
  isCopyTop: PropTypes.bool,
  isCopyBottom: PropTypes.bool,

  column: PropTypes.shape({
    options: PropTypes.array
  }),
  selection: PropTypes.shape({
    startRow: PropTypes.number,
    endRow: PropTypes.number,
    startCol: PropTypes.number,
    endCol: PropTypes.number
  }),
  rowIndex: PropTypes.number,
  columnIndex: PropTypes.number,

  getStyle: PropTypes.func,
  onUpdate: PropTypes.func.isRequired,

  onMouseDown: PropTypes.func,
  onMouseOver: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  onDoubleClick: PropTypes.func,
  onContextMenu: PropTypes.func
};

export default CellAction;