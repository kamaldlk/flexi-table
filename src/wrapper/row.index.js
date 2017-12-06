import React from 'react';
import PropTypes from 'prop-types'; 
import Radium from 'radium';
import tinycolor from 'tinycolor2';
import Styles from '../stylecomponent';

class RowIndex extends React.Component {

  _getStyle = () => {
    const selected = this.props.selected;
    const errors = this.props.errors;
    const hasErrors = errors && Object.keys(errors).length > 0;
    const selectedFactor = this.props.selectedFactor;
    const styles = [Styles.Stretch, Styles.Header, Styles.Unselectable];

    //  Background
    if (hasErrors && selected){
      styles.push({ background: tinycolor(Styles.Colors.danger).darken(selectedFactor).toHexString() });
    } else if (hasErrors) {
      styles.push({ background: Styles.Colors.danger });
    } else if (selected) {
      styles.push({ background: tinycolor(Styles.Colors.white).darken(selectedFactor).toHexString() });
    } else {
      styles.push({ background: tinycolor(Styles.Colors.white).darken(selectedFactor / 4).toHexString() });
    }

    return this.props.getStyle ? this.props.getStyle({selected, errors}, styles) : styles;
  }

  render () {
    const {getStyle,selectedFactor, ...props} = this.props;
    return (
      <div
        { ...props }
        style={ this._getStyle() }>
        { this.props.index == null ? '' : this.props.index + 1 }
      </div>
    );
  }
}

RowIndex.propTypes = {
  index: PropTypes.number,
  selected: PropTypes.bool,
  errors: PropTypes.object,
  getStyle: PropTypes.func,

  selectedFactor: PropTypes.number
};

RowIndex.defaultProps = {
  selectedFactor: Styles.Colors.selectedFactor
};

export default Radium(RowIndex);