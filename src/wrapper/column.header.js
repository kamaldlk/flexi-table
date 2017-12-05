import React from 'react';
import tinycolor from 'tinycolor2';
import PropTypes from 'prop-types';
import Styles from '../stylecomponent';

class ColumnHeader extends React.Component {

  _getStyle = () => {
    const column = this.props.column;
    const required = column.required;
    const selected = this.props.selected;
    const selectedFactor = this.props.selectedFactor;

    const styles = [Styles.Header, Styles.Unselectable];
    //  Background
    if (required && selected){
      styles.push({ background: tinycolor(Styles.Colors.warning).darken(selectedFactor / 3).toHexString() });
    } else if (required) {
      styles.push({ background: Styles.Colors.warning });
    } else if (selected) {
      styles.push({ background: tinycolor(Styles.Colors.white).darken(selectedFactor).toHexString() });
    } else {
      styles.push({ background: tinycolor(Styles.Colors.white).darken(selectedFactor / 3).toHexString() });
    }

    return this.props.getStyle ? this.props.getStyle(column, { selected }, styles) : styles;
  }

  render () {
    return (
      <div
        { ...this.props }
        style={ this._getStyle() }>
        { this.props.column.label || this.props.column.dataKey }
      </div>
    );
  }
}

ColumnHeader.propTypes = {
  column: PropTypes.object,
  selected: PropTypes.bool,
  getStyle: PropTypes.func,

  selectedFactor: PropTypes.number
};

ColumnHeader.defaultProps = {
  selectedFactor: Styles.Colors.selectedFactor
};

export default ColumnHeader;