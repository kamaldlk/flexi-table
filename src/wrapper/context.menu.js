import React from 'react';
import PropTypes from 'prop-types'; 
import Radium from 'radium';
import Styles from '../stylecomponent/';

class Menu extends React.Component {

  _getItems () {
    if (!this.props.items) {
      return;
    }

    return this.props.items.filter((item) => {
      return !!item;
    }).map((item, i) => {
      return (
        <div
          key={i}
          style={ Styles.ContextMenu.item }
          onClick={ item.onClick } >
          { item.label }
        </div>
      );
    });
  }

  render () {
    return (
      <div style={ Styles.ContextMenu.base }>
        { this._getItems() }
      </div>
    );
  }
}

Menu.propTypes = {
  items: PropTypes.array
};

export default Radium(Menu);