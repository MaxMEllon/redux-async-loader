/* eslint-disable react/no-set-state */

/*
 * A part of these functions are:
 *   Copyright (c) 2015 Ryan Florence
 *   Released under the MIT license.
 *   https://github.com/ryanflorence/async-props/blob/master/LICENSE.md
 */

import { Component } from 'react';
import PropTypes from 'prop-types';
import computeChangedRoutes from './computeChangedRoutes';
import { beginAsyncLoad, endAsyncLoad, skipAsyncLoad } from './actions';
import flattenComponents from './flattenComponents';
import loadAsync from './loadAsync';
import { reducerName } from './names';

class ReduxAsyncLoaderContext extends Component {
  constructor(props) {
    super(props);

    this.state = {
      children: null,
      location: props.location,
      params: props.params,
      routes: props.routes,
      mounted: false,
      asyncStatus: "completed",
      loadCount: 0,
      loadErr: null,
    };
    // this.loadCount = 0;
  }

  componentDidMount() {
    const { loading, loaded, onServer } = this.getAsyncLoaderState();
    this.setState({ ...this.state, mounted: true })
    if (loading) {
      return;
    }

    if (loaded && onServer) {
      const { dispatch } = this.props.ctx.store;
      dispatch(skipAsyncLoad(false));
      return;
    }

    this.loadAsync(this.props);
  }

  static getDerivedStateFromProps(props, state) {
    // if (props.location === state.location) {
    //   return {
    //     ...state,
    //     routes: props.routes,
    //     params: props.params,
    //     location: props.location,
    //     children: props.children
    //   }
    // }

    const dispatch = props.ctx.store.dispatch
    console.log("gDSFP", state.asyncStatus)
    switch (state.asyncStatus) {
      case "completed": {
        dispatch(beginAsyncLoad())
        return { ...state, routes: props.routes, params: props.params, location: props.location, asyncStatus: "begin-load", loadCount: state.loadCount + 1, children: props.children }
      }
      case "end-load": {
        if (state.loadErr) props.onError(state.loadErr)
        dispatch(endAsyncLoad())
        return { ...state, routes: props.routes, params: props.params, location: props.location, asyncStatus: "completed", loadCount: state.loadCount + 1, loadErr: null, children: null }
      }
    }
    return { ...state, routes: props.routes, params: props.params, location: props.location }
  }

  componentDidUpdate(props, state) {
    if (this.state.asyncStatus === "begin-load") {
      const { store } = props.ctx
      const { dispatch } = store

      const enterRoutes = computeChangedRoutes(
        {
          routes: this.state.routes,
          params: this.state.params,
          location: this.state.location,
        },
        {
          routes: this.props.routes,
          params: this.props.params,
          location: this.props.location,
        }
      );

      const indexDiff = this.props.components.length - enterRoutes.length;
      const components = flattenComponents(enterRoutes.map(
        (_route, index) => this.props.components[indexDiff + index]
      ));

      loadAsync(components, this.props, store).then(
        () => {
          this.setState({ ...state, routes: this.props.routes, params: this.props.params, location: this.props.location, asyncStatus: "end-load", loadCount: this.state.loadCount + 1  })
        },
        (err) => {
          this.setState({ ...state, routes: this.props.routes, params: this.props.params, location: this.props.location, asyncStatus: "end-load", loadCount: this.state.loadCount + 1, loadErr: err  })
        }
      )
    }
  }

  // shouldComponentUpdate() {
  //   const { loading } = this.getAsyncLoaderState();
  //   return !loading;
  // }

  getAsyncLoaderState() {
    const { getAsyncLoaderState } = this.props;
    const { getState } = this.props.ctx.store;
    return getAsyncLoaderState(getState());
  }

  // loadAsync(props) {
  //   const { children, components } = props;
  //
  //   const flattened = flattenComponents(components);
  //   if (!flattened.length) {
  //     return;
  //   }
  //
  //   const { store } = this.props.ctx;
  //   const { dispatch } = store;
  //   this.beginLoad(dispatch, children)
  //     .then(() => loadAsync(flattened, props, store))
  //     .then(
  //       () => this.endLoad(dispatch),
  //       (error) => this.endLoad(dispatch, error)
  //     );
  // }
  //
  // beginLoad(dispatch, children) {
  //   if (this.loadCount === 0) {
  //     dispatch(beginAsyncLoad());
  //   }
  //
  //   ++this.loadCount;
  //   return new Promise((resolve) => {
  //     this.setState({ children }, () => resolve());
  //   });
  // }
  //
  // endLoad(dispatch, error) {
  //   if (error) {
  //     this.props.onError(error);
  //   }
  //
  //   --this.loadCount;
  //   if (this.loadCount === 0) {
  //     dispatch(endAsyncLoad());
  //     this.setState({ children: null });
  //   }
  // }

  render() {
    const { loading } = this.getAsyncLoaderState();

    return loading ? this.state.children : this.props.children;
  }
}

ReduxAsyncLoaderContext.propTypes = {
  children: PropTypes.node.isRequired,
  components: PropTypes.array.isRequired,
  params: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  getAsyncLoaderState: PropTypes.func,
  onError: PropTypes.func,
};

ReduxAsyncLoaderContext.defaultProps = {
  getAsyncLoaderState(state) {
    return state[reducerName];
  },
  onError(_error) {
    // ignore
  },
};

export default ReduxAsyncLoaderContext;
