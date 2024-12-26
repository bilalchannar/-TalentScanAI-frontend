
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * Schedules a callback to run immediately after the component has been updated.
     *
     * The first time the callback runs will be after the initial `onMount`
     */
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    function construct_svelte_component_dev(component, props) {
        const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
        try {
            const instance = new component(props);
            if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
                throw new Error(error_message);
            }
            return instance;
        }
        catch (err) {
            const { message } = err;
            if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
                throw new Error(error_message);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier} [start]
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let started = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (started) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            started = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
                // We need to set this to false because callbacks can still happen despite having unsubscribed:
                // Callbacks might already be placed in the queue which doesn't know it should no longer
                // invoke this derived store.
                started = false;
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.59.2 */

    const { Error: Error_1, Object: Object_1, console: console_1$2 } = globals;

    // (246:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (dirty & /*component*/ 1 && switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(246:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (239:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (dirty & /*component*/ 1 && switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(239:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getLocation() {
    	const hashPosition = window.location.href.indexOf('#/');

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: '/';

    	// Check if there's a querystring
    	const qsPosition = location.indexOf('?');

    	let querystring = '';

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener('hashchange', update, false);

    	return function stop() {
    		window.removeEventListener('hashchange', update, false);
    	};
    });

    const location = derived(loc, _loc => _loc.location);
    const querystring = derived(loc, _loc => _loc.querystring);
    const params = writable(undefined);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == '#' ? '' : '#') + location;

    	try {
    		const newState = { ...history.state };
    		delete newState['__svelte_spa_router_scrollX'];
    		delete newState['__svelte_spa_router_scrollY'];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn('Caught exception while replacing the current page. If you\'re running this in the Svelte REPL, please note that the `replace` method might not work in this environment.');
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event('hashchange'));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != 'a') {
    		throw Error('Action "link" can only be used with <a> tags');
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    function restoreScroll(state) {
    	// If this exists, then this is a back navigation: restore the scroll position
    	if (state) {
    		window.scrollTo(state.__svelte_spa_router_scrollX, state.__svelte_spa_router_scrollY);
    	} else {
    		// Otherwise this is a forward navigation: scroll to top
    		window.scrollTo(0, 0);
    	}
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute('href');

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == '/') {
    		// Add # to the href attribute
    		href = '#' + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != '#/') {
    		throw Error('Invalid value for "href" attribute: ' + href);
    	}

    	node.setAttribute('href', href);

    	node.addEventListener('click', event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute('href'));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == 'string') {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = '' } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != 'function' && (typeof component != 'object' || component._sveltesparouter !== true)) {
    				throw Error('Invalid component object');
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == 'string' && (path.length < 1 || path.charAt(0) != '/' && path.charAt(0) != '*') || typeof path == 'object' && !(path instanceof RegExp)) {
    				throw Error('Invalid value for "path" argument - strings must start with / or *');
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == 'object' && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == 'string') {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || '/';
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || '/';
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || '') || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && (event.state.__svelte_spa_router_scrollY || event.state.__svelte_spa_router_scrollX)) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener('popstate', popStateChanged);

    		afterUpdate(() => {
    			restoreScroll(previousScrollState);
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == 'object' && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick('conditionsFailed', detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoading', Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == 'object' && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener('popstate', popStateChanged);
    	});

    	const writable_props = ['routes', 'prefix', 'restoreScrollState'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push,
    		pop,
    		replace,
    		link,
    		restoreScroll,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ('component' in $$props) $$invalidate(0, component = $$props.component);
    		if ('componentParams' in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ('props' in $$props) $$invalidate(2, props = $$props.props);
    		if ('previousScrollState' in $$props) previousScrollState = $$props.previousScrollState;
    		if ('popStateChanged' in $$props) popStateChanged = $$props.popStateChanged;
    		if ('lastLoc' in $$props) lastLoc = $$props.lastLoc;
    		if ('componentObj' in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? 'manual' : 'auto';
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\auth\Forgot.svelte generated by Svelte v3.59.2 */
    const file$a = "src\\pages\\auth\\Forgot.svelte";

    function create_fragment$c(ctx) {
    	let h2;
    	let t1;
    	let form;
    	let input;
    	let t2;
    	let br;
    	let t3;
    	let button;
    	let t5;
    	let div;
    	let a;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Forgot Password";
    			t1 = space();
    			form = element("form");
    			input = element("input");
    			t2 = space();
    			br = element("br");
    			t3 = space();
    			button = element("button");
    			button.textContent = "Send Password Reset Email";
    			t5 = space();
    			div = element("div");
    			a = element("a");
    			a.textContent = "← Go Back to Login";
    			add_location(h2, file$a, 4, 0, 57);
    			attr_dev(input, "type", "email");
    			attr_dev(input, "name", "email");
    			attr_dev(input, "placeholder", "Email address");
    			input.required = true;
    			add_location(input, file$a, 6, 4, 118);
    			add_location(br, file$a, 7, 4, 193);
    			attr_dev(button, "type", "button");
    			add_location(button, file$a, 8, 4, 202);
    			attr_dev(form, "action", "#");
    			attr_dev(form, "method", "POST");
    			add_location(form, file$a, 5, 0, 82);
    			attr_dev(a, "href", "/#/auth/login");
    			add_location(a, file$a, 11, 4, 297);
    			attr_dev(div, "class", "extra-links");
    			add_location(div, file$a, 10, 0, 267);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, input);
    			append_dev(form, t2);
    			append_dev(form, br);
    			append_dev(form, t3);
    			append_dev(form, button);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Forgot', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Forgot> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Forgot extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Forgot",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src\pages\auth\Login.svelte generated by Svelte v3.59.2 */

    const { console: console_1$1 } = globals;
    const file$9 = "src\\pages\\auth\\Login.svelte";

    function create_fragment$b(ctx) {
    	let h2;
    	let t1;
    	let p0;
    	let t3;
    	let form;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let br;
    	let t6;
    	let button;
    	let t8;
    	let div;
    	let p1;
    	let t9;
    	let a0;
    	let t11;
    	let a1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Welcome Back!";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Ready to Find the Perfect Candidate?";
    			t3 = space();
    			form = element("form");
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			br = element("br");
    			t6 = space();
    			button = element("button");
    			button.textContent = "Login";
    			t8 = space();
    			div = element("div");
    			p1 = element("p");
    			t9 = text("Don't have an account? ");
    			a0 = element("a");
    			a0.textContent = "Sign Up";
    			t11 = space();
    			a1 = element("a");
    			a1.textContent = "Forgot Password?";
    			add_location(h2, file$9, 34, 0, 972);
    			add_location(p0, file$9, 35, 0, 995);
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "name", "email");
    			attr_dev(input0, "placeholder", "Email address");
    			input0.required = true;
    			add_location(input0, file$9, 38, 4, 1084);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "name", "password");
    			attr_dev(input1, "placeholder", "Password");
    			input1.required = true;
    			add_location(input1, file$9, 45, 4, 1230);
    			add_location(br, file$9, 52, 4, 1380);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$9, 53, 4, 1389);
    			add_location(form, file$9, 37, 0, 1040);
    			attr_dev(a0, "href", "/#/auth/signup");
    			add_location(a0, file$9, 57, 59, 1520);
    			set_style(p1, "margin-bottom", "10px");
    			add_location(p1, file$9, 57, 4, 1465);
    			attr_dev(a1, "href", "/#/auth/forgot");
    			add_location(a1, file$9, 58, 4, 1565);
    			attr_dev(div, "class", "extra-links");
    			add_location(div, file$9, 56, 0, 1435);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, input0);
    			set_input_value(input0, /*email*/ ctx[0]);
    			append_dev(form, t4);
    			append_dev(form, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(form, t5);
    			append_dev(form, br);
    			append_dev(form, t6);
    			append_dev(form, button);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, p1);
    			append_dev(p1, t9);
    			append_dev(p1, a0);
    			append_dev(div, t11);
    			append_dev(div, a1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[4]),
    					listen_dev(form, "submit", prevent_default(/*login*/ ctx[2]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
    				set_input_value(input0, /*email*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	let email = '';
    	let password = '';

    	async function login() {
    		try {
    			const response = await fetch('http://localhost:3000/api/auth/login', {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify({ email, password })
    			});

    			const { data, message } = await response.json();

    			// Navigate to dashboard
    			if (response.status === 200) {
    				localStorage.setItem('token', data.token);
    				console.log('Login successful');
    				replace('/dash/manage');
    			} else {
    				alert(message);
    			}
    		} catch(error) {
    			console.error('Login error:', error);
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => ({ replace, email, password, login });

    	$$self.$inject_state = $$props => {
    		if ('email' in $$props) $$invalidate(0, email = $$props.email);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [email, password, login, input0_input_handler, input1_input_handler];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src\pages\auth\Logout.svelte generated by Svelte v3.59.2 */

    function create_fragment$a(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Logout', slots, []);
    	replace('/auth/login');
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Logout> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ replace });
    	return [];
    }

    class Logout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logout",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src\pages\auth\Reset.svelte generated by Svelte v3.59.2 */
    const file$8 = "src\\pages\\auth\\Reset.svelte";

    function create_fragment$9(ctx) {
    	let h2;
    	let t1;
    	let form;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let br;
    	let t4;
    	let button;
    	let t6;
    	let div;
    	let a;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Reset Password";
    			t1 = space();
    			form = element("form");
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			br = element("br");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Reset Password";
    			t6 = space();
    			div = element("div");
    			a = element("a");
    			a.textContent = "← Go Back to Login";
    			add_location(h2, file$8, 4, 0, 57);
    			attr_dev(input0, "type", "password");
    			attr_dev(input0, "placeholder", "New password");
    			input0.required = true;
    			add_location(input0, file$8, 6, 4, 117);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "Confirm password");
    			input1.required = true;
    			add_location(input1, file$8, 7, 4, 181);
    			add_location(br, file$8, 8, 4, 249);
    			attr_dev(button, "type", "button");
    			add_location(button, file$8, 9, 4, 258);
    			attr_dev(form, "action", "#");
    			attr_dev(form, "method", "POST");
    			add_location(form, file$8, 5, 0, 81);
    			attr_dev(a, "href", "/#/auth/login");
    			add_location(a, file$8, 12, 4, 342);
    			attr_dev(div, "class", "extra-links");
    			add_location(div, file$8, 11, 0, 312);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, input0);
    			append_dev(form, t2);
    			append_dev(form, input1);
    			append_dev(form, t3);
    			append_dev(form, br);
    			append_dev(form, t4);
    			append_dev(form, button);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Reset', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Reset> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Reset extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Reset",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\pages\auth\Signup.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file$7 = "src\\pages\\auth\\Signup.svelte";

    function create_fragment$8(ctx) {
    	let h2;
    	let t1;
    	let p0;
    	let t3;
    	let div1;
    	let section;
    	let form;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let input2;
    	let t6;
    	let input3;
    	let t7;
    	let button;
    	let t9;
    	let div0;
    	let p1;
    	let t10;
    	let a;
    	let t12;
    	let aside;
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Join the Future of Recruitment";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Sign Up and Unlock Smarter Hiring";
    			t3 = space();
    			div1 = element("div");
    			section = element("section");
    			form = element("form");
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			input2 = element("input");
    			t6 = space();
    			input3 = element("input");
    			t7 = space();
    			button = element("button");
    			button.textContent = "Sign Up";
    			t9 = space();
    			div0 = element("div");
    			p1 = element("p");
    			t10 = text("Already have an account? ");
    			a = element("a");
    			a.textContent = "Log in";
    			t12 = space();
    			aside = element("aside");
    			img = element("img");
    			add_location(h2, file$7, 41, 0, 1138);
    			add_location(p0, file$7, 42, 0, 1178);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Full Name");
    			input0.required = true;
    			attr_dev(input0, "class", "svelte-16kryl5");
    			add_location(input0, file$7, 46, 12, 1329);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "placeholder", "Email");
    			input1.required = true;
    			attr_dev(input1, "class", "svelte-16kryl5");
    			add_location(input1, file$7, 52, 12, 1492);
    			attr_dev(input2, "type", "password");
    			attr_dev(input2, "placeholder", "Password");
    			input2.required = true;
    			attr_dev(input2, "class", "svelte-16kryl5");
    			add_location(input2, file$7, 58, 12, 1653);
    			attr_dev(input3, "type", "password");
    			attr_dev(input3, "placeholder", "Confirm Password");
    			input3.required = true;
    			attr_dev(input3, "class", "svelte-16kryl5");
    			add_location(input3, file$7, 64, 12, 1823);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-16kryl5");
    			add_location(button, file$7, 70, 12, 2008);
    			attr_dev(form, "class", "svelte-16kryl5");
    			add_location(form, file$7, 45, 8, 1291);
    			attr_dev(a, "href", "/#/auth/login");
    			attr_dev(a, "class", "svelte-16kryl5");
    			add_location(a, file$7, 73, 40, 2137);
    			attr_dev(p1, "class", "svelte-16kryl5");
    			add_location(p1, file$7, 73, 12, 2109);
    			attr_dev(div0, "class", "extra-links svelte-16kryl5");
    			add_location(div0, file$7, 72, 8, 2071);
    			attr_dev(section, "class", "signup-section svelte-16kryl5");
    			add_location(section, file$7, 44, 4, 1250);
    			if (!src_url_equal(img.src, img_src_value = "imgs/front.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Teamwork Illustration");
    			attr_dev(img, "class", "svelte-16kryl5");
    			add_location(img, file$7, 77, 8, 2248);
    			attr_dev(aside, "class", "image-section svelte-16kryl5");
    			add_location(aside, file$7, 76, 4, 2210);
    			attr_dev(div1, "class", "main-content svelte-16kryl5");
    			add_location(div1, file$7, 43, 0, 1219);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, section);
    			append_dev(section, form);
    			append_dev(form, input0);
    			set_input_value(input0, /*name*/ ctx[0]);
    			append_dev(form, t4);
    			append_dev(form, input1);
    			set_input_value(input1, /*email*/ ctx[1]);
    			append_dev(form, t5);
    			append_dev(form, input2);
    			set_input_value(input2, /*password*/ ctx[2]);
    			append_dev(form, t6);
    			append_dev(form, input3);
    			set_input_value(input3, /*confirmPassword*/ ctx[3]);
    			append_dev(form, t7);
    			append_dev(form, button);
    			append_dev(section, t9);
    			append_dev(section, div0);
    			append_dev(div0, p1);
    			append_dev(p1, t10);
    			append_dev(p1, a);
    			append_dev(div1, t12);
    			append_dev(div1, aside);
    			append_dev(aside, img);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[7]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[8]),
    					listen_dev(form, "submit", /*signup*/ ctx[4], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && input0.value !== /*name*/ ctx[0]) {
    				set_input_value(input0, /*name*/ ctx[0]);
    			}

    			if (dirty & /*email*/ 2 && input1.value !== /*email*/ ctx[1]) {
    				set_input_value(input1, /*email*/ ctx[1]);
    			}

    			if (dirty & /*password*/ 4 && input2.value !== /*password*/ ctx[2]) {
    				set_input_value(input2, /*password*/ ctx[2]);
    			}

    			if (dirty & /*confirmPassword*/ 8 && input3.value !== /*confirmPassword*/ ctx[3]) {
    				set_input_value(input3, /*confirmPassword*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Signup', slots, []);
    	let name = '';
    	let email = '';
    	let password = '';
    	let confirmPassword = '';

    	async function signup(event) {
    		event.preventDefault();

    		// Validate passwords match
    		if (password !== confirmPassword) {
    			alert("Passwords don't match!");
    			return;
    		}

    		try {
    			const response = await fetch('http://localhost:3000/api/auth/signup', {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify({ name, email, password })
    			});

    			const { data, message } = await response.json();

    			if (response.status === 201) {
    				alert('User registered successfully');
    				replace('/auth/login');
    			} else {
    				alert(message);
    			}
    		} catch(error) {
    			console.error('Signup error:', error);
    			alert('An error occurred during signup');
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Signup> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function input1_input_handler() {
    		email = this.value;
    		$$invalidate(1, email);
    	}

    	function input2_input_handler() {
    		password = this.value;
    		$$invalidate(2, password);
    	}

    	function input3_input_handler() {
    		confirmPassword = this.value;
    		$$invalidate(3, confirmPassword);
    	}

    	$$self.$capture_state = () => ({
    		replace,
    		name,
    		email,
    		password,
    		confirmPassword,
    		signup
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('email' in $$props) $$invalidate(1, email = $$props.email);
    		if ('password' in $$props) $$invalidate(2, password = $$props.password);
    		if ('confirmPassword' in $$props) $$invalidate(3, confirmPassword = $$props.confirmPassword);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		email,
    		password,
    		confirmPassword,
    		signup,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler
    	];
    }

    class Signup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Signup",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src\pages\auth\AuthParent.svelte generated by Svelte v3.59.2 */
    const file$6 = "src\\pages\\auth\\AuthParent.svelte";

    function create_fragment$7(ctx) {
    	let div2;
    	let header;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;
    	let div1;
    	let router;
    	let current;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			header = element("header");
    			div0 = element("div");
    			img = element("img");
    			t0 = text("\n            TalentScanAI");
    			t1 = space();
    			div1 = element("div");
    			create_component(router.$$.fragment);
    			if (!src_url_equal(img.src, img_src_value = "imgs/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Logo");
    			set_style(img, "height", "25px");
    			set_style(img, "width", "45px");
    			add_location(img, file$6, 21, 12, 486);
    			attr_dev(div0, "class", "logo svelte-s6od64");
    			add_location(div0, file$6, 20, 8, 455);
    			attr_dev(header, "class", "svelte-s6od64");
    			add_location(header, file$6, 19, 4, 438);
    			attr_dev(div1, "class", "login-section svelte-s6od64");
    			add_location(div1, file$6, 25, 4, 616);
    			attr_dev(div2, "class", "container svelte-s6od64");
    			add_location(div2, file$6, 18, 0, 410);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, header);
    			append_dev(header, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			mount_component(router, div1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AuthParent', slots, []);

    	const routes = {
    		'/auth/forgot': Forgot,
    		'/auth/login': Login,
    		'/auth/logout': Logout,
    		'/auth/reset': Reset,
    		'/auth/signup': Signup
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AuthParent> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		Forgot,
    		Login,
    		Logout,
    		Reset,
    		Signup,
    		routes
    	});

    	return [routes];
    }

    class AuthParent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AuthParent",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\pages\dash\Change.svelte generated by Svelte v3.59.2 */

    const file$5 = "src\\pages\\dash\\Change.svelte";

    function create_fragment$6(ctx) {
    	let section;
    	let div1;
    	let div0;
    	let h3;
    	let t1;
    	let form;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let input2;
    	let t4;
    	let button;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div1 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Change Password";
    			t1 = space();
    			form = element("form");
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			input2 = element("input");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Change Password";
    			attr_dev(h3, "class", "svelte-173iyk7");
    			add_location(h3, file$5, 3, 12, 118);
    			attr_dev(input0, "type", "password");
    			attr_dev(input0, "name", "email");
    			attr_dev(input0, "placeholder", "Old Password");
    			input0.required = true;
    			attr_dev(input0, "class", "svelte-173iyk7");
    			add_location(input0, file$5, 5, 16, 178);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "name", "password");
    			attr_dev(input1, "placeholder", "New Password");
    			input1.required = true;
    			attr_dev(input1, "class", "svelte-173iyk7");
    			add_location(input1, file$5, 6, 16, 267);
    			attr_dev(input2, "type", "password");
    			attr_dev(input2, "name", "password");
    			attr_dev(input2, "placeholder", "Confirm Password");
    			input2.required = true;
    			attr_dev(input2, "class", "svelte-173iyk7");
    			add_location(input2, file$5, 7, 16, 359);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-173iyk7");
    			add_location(button, file$5, 8, 16, 455);
    			attr_dev(form, "class", "svelte-173iyk7");
    			add_location(form, file$5, 4, 12, 155);
    			attr_dev(div0, "class", "settings-section svelte-173iyk7");
    			add_location(div0, file$5, 2, 8, 75);
    			attr_dev(div1, "class", "settings-content svelte-173iyk7");
    			add_location(div1, file$5, 1, 4, 36);
    			attr_dev(section, "class", "settings-page svelte-173iyk7");
    			add_location(section, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, form);
    			append_dev(form, input0);
    			append_dev(form, t2);
    			append_dev(form, input1);
    			append_dev(form, t3);
    			append_dev(form, input2);
    			append_dev(form, t4);
    			append_dev(form, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Change', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Change> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Change extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Change",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\pages\dash\Education.svelte generated by Svelte v3.59.2 */

    const file$4 = "src\\pages\\dash\\Education.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t3;
    	let th1;
    	let t5;
    	let th2;
    	let t7;
    	let th3;
    	let t9;
    	let tbody;
    	let tr1;
    	let td0;
    	let t11;
    	let td1;
    	let t13;
    	let td2;
    	let t15;
    	let td3;
    	let button0;
    	let t17;
    	let button1;
    	let t19;
    	let tr2;
    	let td4;
    	let t21;
    	let td5;
    	let t23;
    	let td6;
    	let t25;
    	let td7;
    	let button2;
    	let t27;
    	let button3;
    	let t29;
    	let tr3;
    	let td8;
    	let t31;
    	let td9;
    	let t33;
    	let td10;
    	let t35;
    	let td11;
    	let button4;
    	let t37;
    	let button5;
    	let t39;
    	let tr4;
    	let td12;
    	let t41;
    	let td13;
    	let t43;
    	let td14;
    	let t45;
    	let td15;
    	let button6;
    	let t47;
    	let button7;
    	let t49;
    	let tr5;
    	let td16;
    	let t51;
    	let td17;
    	let t53;
    	let td18;
    	let t55;
    	let td19;
    	let button8;
    	let t57;
    	let button9;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Educational Background Analysis";
    			t1 = space();
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Candidate Name";
    			t3 = space();
    			th1 = element("th");
    			th1.textContent = "Degree & Certifications";
    			t5 = space();
    			th2 = element("th");
    			th2.textContent = "Institutions";
    			t7 = space();
    			th3 = element("th");
    			th3.textContent = "Action";
    			t9 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "Jane Smith";
    			t11 = space();
    			td1 = element("td");
    			td1.textContent = "Bachelor's in CS, AI Certification";
    			t13 = space();
    			td2 = element("td");
    			td2.textContent = "Harvard University";
    			t15 = space();
    			td3 = element("td");
    			button0 = element("button");
    			button0.textContent = "Analyze";
    			t17 = space();
    			button1 = element("button");
    			button1.textContent = "Highlight Gaps";
    			t19 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "John Doe";
    			t21 = space();
    			td5 = element("td");
    			td5.textContent = "Master's in Data Science";
    			t23 = space();
    			td6 = element("td");
    			td6.textContent = "MIT";
    			t25 = space();
    			td7 = element("td");
    			button2 = element("button");
    			button2.textContent = "Analyze";
    			t27 = space();
    			button3 = element("button");
    			button3.textContent = "Highlight Gaps";
    			t29 = space();
    			tr3 = element("tr");
    			td8 = element("td");
    			td8.textContent = "Emily White";
    			t31 = space();
    			td9 = element("td");
    			td9.textContent = "PhD in Machine Learning";
    			t33 = space();
    			td10 = element("td");
    			td10.textContent = "Stanford University";
    			t35 = space();
    			td11 = element("td");
    			button4 = element("button");
    			button4.textContent = "Analyze";
    			t37 = space();
    			button5 = element("button");
    			button5.textContent = "Highlight Gaps";
    			t39 = space();
    			tr4 = element("tr");
    			td12 = element("td");
    			td12.textContent = "Bob Johnson";
    			t41 = space();
    			td13 = element("td");
    			td13.textContent = "Bachelor's in Software Engineering";
    			t43 = space();
    			td14 = element("td");
    			td14.textContent = "California Institute of Technology";
    			t45 = space();
    			td15 = element("td");
    			button6 = element("button");
    			button6.textContent = "Analyze";
    			t47 = space();
    			button7 = element("button");
    			button7.textContent = "Highlight Gaps";
    			t49 = space();
    			tr5 = element("tr");
    			td16 = element("td");
    			td16.textContent = "Alice Brown";
    			t51 = space();
    			td17 = element("td");
    			td17.textContent = "Master's in AI and Robotics";
    			t53 = space();
    			td18 = element("td");
    			td18.textContent = "Oxford University";
    			t55 = space();
    			td19 = element("td");
    			button8 = element("button");
    			button8.textContent = "Analyze";
    			t57 = space();
    			button9 = element("button");
    			button9.textContent = "Highlight Gaps";
    			attr_dev(h2, "class", "svelte-a3xi7m");
    			add_location(h2, file$4, 3, 4, 36);
    			attr_dev(th0, "class", "svelte-a3xi7m");
    			add_location(th0, file$4, 8, 16, 144);
    			attr_dev(th1, "class", "svelte-a3xi7m");
    			add_location(th1, file$4, 9, 16, 185);
    			attr_dev(th2, "class", "svelte-a3xi7m");
    			add_location(th2, file$4, 10, 16, 235);
    			attr_dev(th3, "class", "svelte-a3xi7m");
    			add_location(th3, file$4, 11, 16, 274);
    			add_location(tr0, file$4, 7, 12, 122);
    			add_location(thead, file$4, 6, 8, 101);
    			attr_dev(td0, "class", "svelte-a3xi7m");
    			add_location(td0, file$4, 16, 16, 379);
    			attr_dev(td1, "class", "svelte-a3xi7m");
    			add_location(td1, file$4, 17, 16, 416);
    			attr_dev(td2, "class", "svelte-a3xi7m");
    			add_location(td2, file$4, 18, 16, 477);
    			attr_dev(button0, "class", "analyze-button svelte-a3xi7m");
    			add_location(button0, file$4, 20, 20, 548);
    			attr_dev(button1, "class", "highlight-button svelte-a3xi7m");
    			add_location(button1, file$4, 21, 20, 617);
    			attr_dev(td3, "class", "svelte-a3xi7m");
    			add_location(td3, file$4, 19, 16, 522);
    			add_location(tr1, file$4, 15, 12, 357);
    			attr_dev(td4, "class", "svelte-a3xi7m");
    			add_location(td4, file$4, 25, 16, 751);
    			attr_dev(td5, "class", "svelte-a3xi7m");
    			add_location(td5, file$4, 26, 16, 786);
    			attr_dev(td6, "class", "svelte-a3xi7m");
    			add_location(td6, file$4, 27, 16, 837);
    			attr_dev(button2, "class", "analyze-button svelte-a3xi7m");
    			add_location(button2, file$4, 29, 20, 893);
    			attr_dev(button3, "class", "highlight-button svelte-a3xi7m");
    			add_location(button3, file$4, 30, 20, 962);
    			attr_dev(td7, "class", "svelte-a3xi7m");
    			add_location(td7, file$4, 28, 16, 867);
    			add_location(tr2, file$4, 24, 12, 729);
    			attr_dev(td8, "class", "svelte-a3xi7m");
    			add_location(td8, file$4, 34, 16, 1096);
    			attr_dev(td9, "class", "svelte-a3xi7m");
    			add_location(td9, file$4, 35, 16, 1134);
    			attr_dev(td10, "class", "svelte-a3xi7m");
    			add_location(td10, file$4, 36, 16, 1184);
    			attr_dev(button4, "class", "analyze-button svelte-a3xi7m");
    			add_location(button4, file$4, 38, 20, 1256);
    			attr_dev(button5, "class", "highlight-button svelte-a3xi7m");
    			add_location(button5, file$4, 39, 20, 1325);
    			attr_dev(td11, "class", "svelte-a3xi7m");
    			add_location(td11, file$4, 37, 16, 1230);
    			add_location(tr3, file$4, 33, 12, 1074);
    			attr_dev(td12, "class", "svelte-a3xi7m");
    			add_location(td12, file$4, 43, 16, 1459);
    			attr_dev(td13, "class", "svelte-a3xi7m");
    			add_location(td13, file$4, 44, 16, 1497);
    			attr_dev(td14, "class", "svelte-a3xi7m");
    			add_location(td14, file$4, 45, 16, 1558);
    			attr_dev(button6, "class", "analyze-button svelte-a3xi7m");
    			add_location(button6, file$4, 47, 20, 1645);
    			attr_dev(button7, "class", "highlight-button svelte-a3xi7m");
    			add_location(button7, file$4, 48, 20, 1714);
    			attr_dev(td15, "class", "svelte-a3xi7m");
    			add_location(td15, file$4, 46, 16, 1619);
    			add_location(tr4, file$4, 42, 12, 1437);
    			attr_dev(td16, "class", "svelte-a3xi7m");
    			add_location(td16, file$4, 52, 16, 1848);
    			attr_dev(td17, "class", "svelte-a3xi7m");
    			add_location(td17, file$4, 53, 16, 1886);
    			attr_dev(td18, "class", "svelte-a3xi7m");
    			add_location(td18, file$4, 54, 16, 1940);
    			attr_dev(button8, "class", "analyze-button svelte-a3xi7m");
    			add_location(button8, file$4, 56, 20, 2010);
    			attr_dev(button9, "class", "highlight-button svelte-a3xi7m");
    			add_location(button9, file$4, 57, 20, 2079);
    			attr_dev(td19, "class", "svelte-a3xi7m");
    			add_location(td19, file$4, 55, 16, 1984);
    			add_location(tr5, file$4, 51, 12, 1826);
    			add_location(tbody, file$4, 14, 8, 336);
    			attr_dev(table, "class", "svelte-a3xi7m");
    			add_location(table, file$4, 5, 4, 84);
    			attr_dev(div, "class", "main-content svelte-a3xi7m");
    			add_location(div, file$4, 2, 0, 4);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			append_dev(div, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t3);
    			append_dev(tr0, th1);
    			append_dev(tr0, t5);
    			append_dev(tr0, th2);
    			append_dev(tr0, t7);
    			append_dev(tr0, th3);
    			append_dev(table, t9);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t11);
    			append_dev(tr1, td1);
    			append_dev(tr1, t13);
    			append_dev(tr1, td2);
    			append_dev(tr1, t15);
    			append_dev(tr1, td3);
    			append_dev(td3, button0);
    			append_dev(td3, t17);
    			append_dev(td3, button1);
    			append_dev(tbody, t19);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, t21);
    			append_dev(tr2, td5);
    			append_dev(tr2, t23);
    			append_dev(tr2, td6);
    			append_dev(tr2, t25);
    			append_dev(tr2, td7);
    			append_dev(td7, button2);
    			append_dev(td7, t27);
    			append_dev(td7, button3);
    			append_dev(tbody, t29);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td8);
    			append_dev(tr3, t31);
    			append_dev(tr3, td9);
    			append_dev(tr3, t33);
    			append_dev(tr3, td10);
    			append_dev(tr3, t35);
    			append_dev(tr3, td11);
    			append_dev(td11, button4);
    			append_dev(td11, t37);
    			append_dev(td11, button5);
    			append_dev(tbody, t39);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td12);
    			append_dev(tr4, t41);
    			append_dev(tr4, td13);
    			append_dev(tr4, t43);
    			append_dev(tr4, td14);
    			append_dev(tr4, t45);
    			append_dev(tr4, td15);
    			append_dev(td15, button6);
    			append_dev(td15, t47);
    			append_dev(td15, button7);
    			append_dev(tbody, t49);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td16);
    			append_dev(tr5, t51);
    			append_dev(tr5, td17);
    			append_dev(tr5, t53);
    			append_dev(tr5, td18);
    			append_dev(tr5, t55);
    			append_dev(tr5, td19);
    			append_dev(td19, button8);
    			append_dev(td19, t57);
    			append_dev(td19, button9);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Education', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Education> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Education extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Education",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\pages\dash\Manage.svelte generated by Svelte v3.59.2 */

    const file$3 = "src\\pages\\dash\\Manage.svelte";

    function create_fragment$4(ctx) {
    	let header;
    	let h1;
    	let t1;
    	let div1;
    	let button0;
    	let t3;
    	let div0;
    	let h3;
    	let t5;
    	let p;
    	let t7;
    	let section;
    	let div2;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t9;
    	let th1;
    	let t11;
    	let th2;
    	let t13;
    	let th3;
    	let t15;
    	let tbody;
    	let tr1;
    	let td0;
    	let t17;
    	let td1;
    	let t19;
    	let td2;
    	let t21;
    	let td3;
    	let button1;
    	let t23;
    	let button2;
    	let t25;
    	let tr2;
    	let td4;
    	let t27;
    	let td5;
    	let t29;
    	let td6;
    	let t31;
    	let td7;
    	let button3;
    	let t33;
    	let button4;
    	let t35;
    	let tr3;
    	let td8;
    	let t37;
    	let td9;
    	let t39;
    	let td10;
    	let t41;
    	let td11;
    	let button5;
    	let t43;
    	let button6;
    	let t45;
    	let tr4;
    	let td12;
    	let t47;
    	let td13;
    	let t49;
    	let td14;
    	let t51;
    	let td15;
    	let button7;
    	let t53;
    	let button8;
    	let t55;
    	let tr5;
    	let td16;
    	let t57;
    	let td17;
    	let t59;
    	let td18;
    	let t61;
    	let td19;
    	let button9;
    	let t63;
    	let button10;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Manage Resumes";
    			t1 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Upload";
    			t3 = space();
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Total Resumes Uploaded";
    			t5 = space();
    			p = element("p");
    			p.textContent = "5";
    			t7 = space();
    			section = element("section");
    			div2 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Candidate Name";
    			t9 = space();
    			th1 = element("th");
    			th1.textContent = "Resume File";
    			t11 = space();
    			th2 = element("th");
    			th2.textContent = "Upload Date";
    			t13 = space();
    			th3 = element("th");
    			th3.textContent = "Action";
    			t15 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "John Doe";
    			t17 = space();
    			td1 = element("td");
    			td1.textContent = "john_doe_resume.pdf";
    			t19 = space();
    			td2 = element("td");
    			td2.textContent = "2024-11-25";
    			t21 = space();
    			td3 = element("td");
    			button1 = element("button");
    			button1.textContent = "Analyse";
    			t23 = space();
    			button2 = element("button");
    			button2.textContent = "Delete";
    			t25 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "Jane Smith";
    			t27 = space();
    			td5 = element("td");
    			td5.textContent = "jane_smith_resume.pdf";
    			t29 = space();
    			td6 = element("td");
    			td6.textContent = "2024-11-26";
    			t31 = space();
    			td7 = element("td");
    			button3 = element("button");
    			button3.textContent = "Analyse";
    			t33 = space();
    			button4 = element("button");
    			button4.textContent = "Delete";
    			t35 = space();
    			tr3 = element("tr");
    			td8 = element("td");
    			td8.textContent = "Bob Johnson";
    			t37 = space();
    			td9 = element("td");
    			td9.textContent = "bob_johnson_resume.pdf";
    			t39 = space();
    			td10 = element("td");
    			td10.textContent = "2024-11-27";
    			t41 = space();
    			td11 = element("td");
    			button5 = element("button");
    			button5.textContent = "Analyse";
    			t43 = space();
    			button6 = element("button");
    			button6.textContent = "Delete";
    			t45 = space();
    			tr4 = element("tr");
    			td12 = element("td");
    			td12.textContent = "Alice Brown";
    			t47 = space();
    			td13 = element("td");
    			td13.textContent = "alice_brown_resume.pdf";
    			t49 = space();
    			td14 = element("td");
    			td14.textContent = "2024-11-28";
    			t51 = space();
    			td15 = element("td");
    			button7 = element("button");
    			button7.textContent = "Analyse";
    			t53 = space();
    			button8 = element("button");
    			button8.textContent = "Delete";
    			t55 = space();
    			tr5 = element("tr");
    			td16 = element("td");
    			td16.textContent = "Michael White";
    			t57 = space();
    			td17 = element("td");
    			td17.textContent = "michael_white_resume.pdf";
    			t59 = space();
    			td18 = element("td");
    			td18.textContent = "2024-11-29";
    			t61 = space();
    			td19 = element("td");
    			button9 = element("button");
    			button9.textContent = "Analyse";
    			t63 = space();
    			button10 = element("button");
    			button10.textContent = "Delete";
    			attr_dev(h1, "class", "svelte-idx6k7");
    			add_location(h1, file$3, 1, 4, 57);
    			set_style(button0, "width", "100px");
    			set_style(button0, "border-radius", "10px");
    			set_style(button0, "border", "none");
    			set_style(button0, "background-color", "lightgray");
    			add_location(button0, file$3, 3, 8, 113);
    			attr_dev(h3, "class", "svelte-idx6k7");
    			add_location(h3, file$3, 5, 12, 265);
    			attr_dev(p, "class", "svelte-idx6k7");
    			add_location(p, file$3, 6, 12, 309);
    			attr_dev(div0, "class", "stat-box svelte-idx6k7");
    			add_location(div0, file$3, 4, 8, 230);
    			attr_dev(div1, "class", "stats svelte-idx6k7");
    			add_location(div1, file$3, 2, 4, 85);
    			set_style(header, "display", "flex");
    			set_style(header, "align-items", "center");
    			attr_dev(header, "class", "svelte-idx6k7");
    			add_location(header, file$3, 0, 0, 0);
    			attr_dev(th0, "class", "svelte-idx6k7");
    			add_location(th0, file$3, 16, 20, 489);
    			attr_dev(th1, "class", "svelte-idx6k7");
    			add_location(th1, file$3, 17, 20, 533);
    			attr_dev(th2, "class", "svelte-idx6k7");
    			add_location(th2, file$3, 18, 20, 574);
    			attr_dev(th3, "class", "svelte-idx6k7");
    			add_location(th3, file$3, 19, 20, 615);
    			add_location(tr0, file$3, 15, 16, 464);
    			add_location(thead, file$3, 14, 12, 440);
    			attr_dev(td0, "class", "svelte-idx6k7");
    			add_location(td0, file$3, 24, 20, 735);
    			attr_dev(td1, "class", "svelte-idx6k7");
    			add_location(td1, file$3, 25, 20, 773);
    			attr_dev(td2, "class", "svelte-idx6k7");
    			add_location(td2, file$3, 26, 20, 822);
    			attr_dev(button1, "onclick", "window.location.href='#/dash/Education'");
    			attr_dev(button1, "class", "svelte-idx6k7");
    			add_location(button1, file$3, 28, 24, 891);
    			set_style(button2, "background-color", "red");
    			attr_dev(button2, "class", "svelte-idx6k7");
    			add_location(button2, file$3, 29, 24, 990);
    			attr_dev(td3, "class", "svelte-idx6k7");
    			add_location(td3, file$3, 27, 20, 862);
    			add_location(tr1, file$3, 23, 16, 710);
    			attr_dev(td4, "class", "svelte-idx6k7");
    			add_location(td4, file$3, 33, 20, 1134);
    			attr_dev(td5, "class", "svelte-idx6k7");
    			add_location(td5, file$3, 34, 20, 1174);
    			attr_dev(td6, "class", "svelte-idx6k7");
    			add_location(td6, file$3, 35, 20, 1225);
    			attr_dev(button3, "onclick", "window.location.href='#/dash/Education'");
    			attr_dev(button3, "class", "svelte-idx6k7");
    			add_location(button3, file$3, 37, 24, 1294);
    			set_style(button4, "background-color", "red");
    			attr_dev(button4, "class", "svelte-idx6k7");
    			add_location(button4, file$3, 38, 24, 1393);
    			attr_dev(td7, "class", "svelte-idx6k7");
    			add_location(td7, file$3, 36, 20, 1265);
    			add_location(tr2, file$3, 32, 16, 1109);
    			attr_dev(td8, "class", "svelte-idx6k7");
    			add_location(td8, file$3, 42, 20, 1537);
    			attr_dev(td9, "class", "svelte-idx6k7");
    			add_location(td9, file$3, 43, 20, 1578);
    			attr_dev(td10, "class", "svelte-idx6k7");
    			add_location(td10, file$3, 44, 20, 1630);
    			attr_dev(button5, "onclick", "window.location.href='#/dash/Education'");
    			attr_dev(button5, "class", "svelte-idx6k7");
    			add_location(button5, file$3, 46, 24, 1699);
    			set_style(button6, "background-color", "red");
    			attr_dev(button6, "class", "svelte-idx6k7");
    			add_location(button6, file$3, 47, 24, 1798);
    			attr_dev(td11, "class", "svelte-idx6k7");
    			add_location(td11, file$3, 45, 20, 1670);
    			add_location(tr3, file$3, 41, 16, 1512);
    			attr_dev(td12, "class", "svelte-idx6k7");
    			add_location(td12, file$3, 51, 20, 1942);
    			attr_dev(td13, "class", "svelte-idx6k7");
    			add_location(td13, file$3, 52, 20, 1983);
    			attr_dev(td14, "class", "svelte-idx6k7");
    			add_location(td14, file$3, 53, 20, 2035);
    			attr_dev(button7, "onclick", "window.location.href='#/dash/Education'");
    			attr_dev(button7, "class", "svelte-idx6k7");
    			add_location(button7, file$3, 55, 24, 2104);
    			set_style(button8, "background-color", "red");
    			attr_dev(button8, "class", "svelte-idx6k7");
    			add_location(button8, file$3, 56, 24, 2203);
    			attr_dev(td15, "class", "svelte-idx6k7");
    			add_location(td15, file$3, 54, 20, 2075);
    			add_location(tr4, file$3, 50, 16, 1917);
    			attr_dev(td16, "class", "svelte-idx6k7");
    			add_location(td16, file$3, 60, 20, 2347);
    			attr_dev(td17, "class", "svelte-idx6k7");
    			add_location(td17, file$3, 61, 20, 2390);
    			attr_dev(td18, "class", "svelte-idx6k7");
    			add_location(td18, file$3, 62, 20, 2444);
    			attr_dev(button9, "onclick", "window.location.href='#/dash/Education'");
    			attr_dev(button9, "class", "svelte-idx6k7");
    			add_location(button9, file$3, 64, 24, 2513);
    			set_style(button10, "background-color", "red");
    			attr_dev(button10, "class", "svelte-idx6k7");
    			add_location(button10, file$3, 65, 24, 2612);
    			attr_dev(td19, "class", "svelte-idx6k7");
    			add_location(td19, file$3, 63, 20, 2484);
    			add_location(tr5, file$3, 59, 16, 2322);
    			add_location(tbody, file$3, 22, 12, 686);
    			attr_dev(table, "class", "svelte-idx6k7");
    			add_location(table, file$3, 13, 8, 420);
    			attr_dev(div2, "class", "resume-table svelte-idx6k7");
    			add_location(div2, file$3, 12, 4, 385);
    			attr_dev(section, "class", "content");
    			add_location(section, file$3, 11, 0, 355);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    			append_dev(header, t1);
    			append_dev(header, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t5);
    			append_dev(div0, p);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, section, anchor);
    			append_dev(section, div2);
    			append_dev(div2, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t9);
    			append_dev(tr0, th1);
    			append_dev(tr0, t11);
    			append_dev(tr0, th2);
    			append_dev(tr0, t13);
    			append_dev(tr0, th3);
    			append_dev(table, t15);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t17);
    			append_dev(tr1, td1);
    			append_dev(tr1, t19);
    			append_dev(tr1, td2);
    			append_dev(tr1, t21);
    			append_dev(tr1, td3);
    			append_dev(td3, button1);
    			append_dev(td3, t23);
    			append_dev(td3, button2);
    			append_dev(tbody, t25);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, t27);
    			append_dev(tr2, td5);
    			append_dev(tr2, t29);
    			append_dev(tr2, td6);
    			append_dev(tr2, t31);
    			append_dev(tr2, td7);
    			append_dev(td7, button3);
    			append_dev(td7, t33);
    			append_dev(td7, button4);
    			append_dev(tbody, t35);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td8);
    			append_dev(tr3, t37);
    			append_dev(tr3, td9);
    			append_dev(tr3, t39);
    			append_dev(tr3, td10);
    			append_dev(tr3, t41);
    			append_dev(tr3, td11);
    			append_dev(td11, button5);
    			append_dev(td11, t43);
    			append_dev(td11, button6);
    			append_dev(tbody, t45);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td12);
    			append_dev(tr4, t47);
    			append_dev(tr4, td13);
    			append_dev(tr4, t49);
    			append_dev(tr4, td14);
    			append_dev(tr4, t51);
    			append_dev(tr4, td15);
    			append_dev(td15, button7);
    			append_dev(td15, t53);
    			append_dev(td15, button8);
    			append_dev(tbody, t55);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td16);
    			append_dev(tr5, t57);
    			append_dev(tr5, td17);
    			append_dev(tr5, t59);
    			append_dev(tr5, td18);
    			append_dev(tr5, t61);
    			append_dev(tr5, td19);
    			append_dev(td19, button9);
    			append_dev(td19, t63);
    			append_dev(td19, button10);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Manage', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Manage> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Manage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Manage",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\pages\dash\Rank.svelte generated by Svelte v3.59.2 */

    const file$2 = "src\\pages\\dash\\Rank.svelte";

    function create_fragment$3(ctx) {
    	let header;
    	let h1;
    	let t1;
    	let div1;
    	let div0;
    	let h2;
    	let t3;
    	let textarea;
    	let t4;
    	let section;
    	let div2;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t6;
    	let th1;
    	let t8;
    	let th2;
    	let t10;
    	let th3;
    	let t12;
    	let th4;
    	let t14;
    	let tbody;
    	let tr1;
    	let td0;
    	let t16;
    	let td1;
    	let t18;
    	let td2;
    	let t20;
    	let td3;
    	let t22;
    	let td4;
    	let button0;
    	let t24;
    	let tr2;
    	let td5;
    	let t26;
    	let td6;
    	let t28;
    	let td7;
    	let t30;
    	let td8;
    	let t32;
    	let td9;
    	let button1;
    	let t34;
    	let tr3;
    	let td10;
    	let t36;
    	let td11;
    	let t38;
    	let td12;
    	let t40;
    	let td13;
    	let t42;
    	let td14;
    	let button2;
    	let t44;
    	let tr4;
    	let td15;
    	let t46;
    	let td16;
    	let t48;
    	let td17;
    	let t50;
    	let td18;
    	let t52;
    	let td19;
    	let button3;
    	let t54;
    	let tr5;
    	let td20;
    	let t56;
    	let td21;
    	let t58;
    	let td22;
    	let t60;
    	let td23;
    	let t62;
    	let td24;
    	let button4;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Rank Resumes";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Enter Job Description";
    			t3 = space();
    			textarea = element("textarea");
    			t4 = space();
    			section = element("section");
    			div2 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Rank";
    			t6 = space();
    			th1 = element("th");
    			th1.textContent = "Name";
    			t8 = space();
    			th2 = element("th");
    			th2.textContent = "Skills";
    			t10 = space();
    			th3 = element("th");
    			th3.textContent = "Ranking";
    			t12 = space();
    			th4 = element("th");
    			th4.textContent = "Actions";
    			t14 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "1";
    			t16 = space();
    			td1 = element("td");
    			td1.textContent = "John Doe";
    			t18 = space();
    			td2 = element("td");
    			td2.textContent = "Java, Python, SQL";
    			t20 = space();
    			td3 = element("td");
    			td3.textContent = "95";
    			t22 = space();
    			td4 = element("td");
    			button0 = element("button");
    			button0.textContent = "View Reasoning";
    			t24 = space();
    			tr2 = element("tr");
    			td5 = element("td");
    			td5.textContent = "2";
    			t26 = space();
    			td6 = element("td");
    			td6.textContent = "Michael White";
    			t28 = space();
    			td7 = element("td");
    			td7.textContent = "JavaScript, Node.js, HTML";
    			t30 = space();
    			td8 = element("td");
    			td8.textContent = "90";
    			t32 = space();
    			td9 = element("td");
    			button1 = element("button");
    			button1.textContent = "View Reasoning";
    			t34 = space();
    			tr3 = element("tr");
    			td10 = element("td");
    			td10.textContent = "3";
    			t36 = space();
    			td11 = element("td");
    			td11.textContent = "Jane Smith";
    			t38 = space();
    			td12 = element("td");
    			td12.textContent = "HTML, CSS, JavaScript";
    			t40 = space();
    			td13 = element("td");
    			td13.textContent = "88";
    			t42 = space();
    			td14 = element("td");
    			button2 = element("button");
    			button2.textContent = "View Reasoning";
    			t44 = space();
    			tr4 = element("tr");
    			td15 = element("td");
    			td15.textContent = "4";
    			t46 = space();
    			td16 = element("td");
    			td16.textContent = "Bob Johnson";
    			t48 = space();
    			td17 = element("td");
    			td17.textContent = "Python, Data Science, AI";
    			t50 = space();
    			td18 = element("td");
    			td18.textContent = "85";
    			t52 = space();
    			td19 = element("td");
    			button3 = element("button");
    			button3.textContent = "View Reasoning";
    			t54 = space();
    			tr5 = element("tr");
    			td20 = element("td");
    			td20.textContent = "5";
    			t56 = space();
    			td21 = element("td");
    			td21.textContent = "Alice Brown";
    			t58 = space();
    			td22 = element("td");
    			td22.textContent = "C++, Java, Algorithms";
    			t60 = space();
    			td23 = element("td");
    			td23.textContent = "80";
    			t62 = space();
    			td24 = element("td");
    			button4 = element("button");
    			button4.textContent = "View Reasoning";
    			add_location(h1, file$2, 1, 4, 57);
    			set_style(header, "display", "flex");
    			set_style(header, "align-items", "center");
    			attr_dev(header, "class", "svelte-1n27nct");
    			add_location(header, file$2, 0, 0, 0);
    			add_location(h2, file$2, 6, 8, 158);
    			attr_dev(textarea, "placeholder", "Copy-paste or type it here...");
    			attr_dev(textarea, "rows", "10");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "padding", "10px");
    			set_style(textarea, "border", "1px solid #ddd");
    			set_style(textarea, "border-radius", "5px");
    			attr_dev(textarea, "class", "svelte-1n27nct");
    			add_location(textarea, file$2, 7, 8, 197);
    			attr_dev(div0, "class", "job-description svelte-1n27nct");
    			add_location(div0, file$2, 5, 4, 120);
    			attr_dev(div1, "class", "job-section svelte-1n27nct");
    			add_location(div1, file$2, 4, 0, 90);
    			attr_dev(th0, "class", "svelte-1n27nct");
    			add_location(th0, file$2, 16, 20, 507);
    			attr_dev(th1, "class", "svelte-1n27nct");
    			add_location(th1, file$2, 17, 20, 541);
    			attr_dev(th2, "class", "svelte-1n27nct");
    			add_location(th2, file$2, 18, 20, 575);
    			attr_dev(th3, "class", "svelte-1n27nct");
    			add_location(th3, file$2, 19, 20, 611);
    			attr_dev(th4, "class", "svelte-1n27nct");
    			add_location(th4, file$2, 20, 20, 648);
    			add_location(tr0, file$2, 15, 16, 482);
    			add_location(thead, file$2, 14, 12, 458);
    			attr_dev(td0, "class", "svelte-1n27nct");
    			add_location(td0, file$2, 25, 20, 769);
    			attr_dev(td1, "class", "svelte-1n27nct");
    			add_location(td1, file$2, 26, 20, 800);
    			attr_dev(td2, "class", "svelte-1n27nct");
    			add_location(td2, file$2, 27, 20, 838);
    			attr_dev(td3, "class", "svelte-1n27nct");
    			add_location(td3, file$2, 28, 20, 885);
    			attr_dev(button0, "class", "svelte-1n27nct");
    			add_location(button0, file$2, 29, 24, 921);
    			attr_dev(td4, "class", "svelte-1n27nct");
    			add_location(td4, file$2, 29, 20, 917);
    			add_location(tr1, file$2, 24, 16, 744);
    			attr_dev(td5, "class", "svelte-1n27nct");
    			add_location(td5, file$2, 32, 20, 1021);
    			attr_dev(td6, "class", "svelte-1n27nct");
    			add_location(td6, file$2, 33, 20, 1052);
    			attr_dev(td7, "class", "svelte-1n27nct");
    			add_location(td7, file$2, 34, 20, 1095);
    			attr_dev(td8, "class", "svelte-1n27nct");
    			add_location(td8, file$2, 35, 20, 1150);
    			attr_dev(button1, "class", "svelte-1n27nct");
    			add_location(button1, file$2, 36, 24, 1186);
    			attr_dev(td9, "class", "svelte-1n27nct");
    			add_location(td9, file$2, 36, 20, 1182);
    			add_location(tr2, file$2, 31, 16, 996);
    			attr_dev(td10, "class", "svelte-1n27nct");
    			add_location(td10, file$2, 39, 20, 1286);
    			attr_dev(td11, "class", "svelte-1n27nct");
    			add_location(td11, file$2, 40, 20, 1317);
    			attr_dev(td12, "class", "svelte-1n27nct");
    			add_location(td12, file$2, 41, 20, 1357);
    			attr_dev(td13, "class", "svelte-1n27nct");
    			add_location(td13, file$2, 42, 20, 1408);
    			attr_dev(button2, "class", "svelte-1n27nct");
    			add_location(button2, file$2, 43, 24, 1444);
    			attr_dev(td14, "class", "svelte-1n27nct");
    			add_location(td14, file$2, 43, 20, 1440);
    			add_location(tr3, file$2, 38, 16, 1261);
    			attr_dev(td15, "class", "svelte-1n27nct");
    			add_location(td15, file$2, 46, 20, 1544);
    			attr_dev(td16, "class", "svelte-1n27nct");
    			add_location(td16, file$2, 47, 20, 1575);
    			attr_dev(td17, "class", "svelte-1n27nct");
    			add_location(td17, file$2, 48, 20, 1616);
    			attr_dev(td18, "class", "svelte-1n27nct");
    			add_location(td18, file$2, 49, 20, 1670);
    			attr_dev(button3, "class", "svelte-1n27nct");
    			add_location(button3, file$2, 50, 24, 1706);
    			attr_dev(td19, "class", "svelte-1n27nct");
    			add_location(td19, file$2, 50, 20, 1702);
    			add_location(tr4, file$2, 45, 16, 1519);
    			attr_dev(td20, "class", "svelte-1n27nct");
    			add_location(td20, file$2, 53, 20, 1806);
    			attr_dev(td21, "class", "svelte-1n27nct");
    			add_location(td21, file$2, 54, 20, 1837);
    			attr_dev(td22, "class", "svelte-1n27nct");
    			add_location(td22, file$2, 55, 20, 1878);
    			attr_dev(td23, "class", "svelte-1n27nct");
    			add_location(td23, file$2, 56, 20, 1929);
    			attr_dev(button4, "class", "svelte-1n27nct");
    			add_location(button4, file$2, 57, 24, 1965);
    			attr_dev(td24, "class", "svelte-1n27nct");
    			add_location(td24, file$2, 57, 20, 1961);
    			add_location(tr5, file$2, 52, 16, 1781);
    			add_location(tbody, file$2, 23, 12, 720);
    			attr_dev(table, "class", "svelte-1n27nct");
    			add_location(table, file$2, 13, 8, 438);
    			attr_dev(div2, "class", "table-section svelte-1n27nct");
    			add_location(div2, file$2, 12, 4, 402);
    			attr_dev(section, "class", "content svelte-1n27nct");
    			add_location(section, file$2, 11, 0, 372);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t3);
    			append_dev(div0, textarea);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, section, anchor);
    			append_dev(section, div2);
    			append_dev(div2, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t6);
    			append_dev(tr0, th1);
    			append_dev(tr0, t8);
    			append_dev(tr0, th2);
    			append_dev(tr0, t10);
    			append_dev(tr0, th3);
    			append_dev(tr0, t12);
    			append_dev(tr0, th4);
    			append_dev(table, t14);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t16);
    			append_dev(tr1, td1);
    			append_dev(tr1, t18);
    			append_dev(tr1, td2);
    			append_dev(tr1, t20);
    			append_dev(tr1, td3);
    			append_dev(tr1, t22);
    			append_dev(tr1, td4);
    			append_dev(td4, button0);
    			append_dev(tbody, t24);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td5);
    			append_dev(tr2, t26);
    			append_dev(tr2, td6);
    			append_dev(tr2, t28);
    			append_dev(tr2, td7);
    			append_dev(tr2, t30);
    			append_dev(tr2, td8);
    			append_dev(tr2, t32);
    			append_dev(tr2, td9);
    			append_dev(td9, button1);
    			append_dev(tbody, t34);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td10);
    			append_dev(tr3, t36);
    			append_dev(tr3, td11);
    			append_dev(tr3, t38);
    			append_dev(tr3, td12);
    			append_dev(tr3, t40);
    			append_dev(tr3, td13);
    			append_dev(tr3, t42);
    			append_dev(tr3, td14);
    			append_dev(td14, button2);
    			append_dev(tbody, t44);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td15);
    			append_dev(tr4, t46);
    			append_dev(tr4, td16);
    			append_dev(tr4, t48);
    			append_dev(tr4, td17);
    			append_dev(tr4, t50);
    			append_dev(tr4, td18);
    			append_dev(tr4, t52);
    			append_dev(tr4, td19);
    			append_dev(td19, button3);
    			append_dev(tbody, t54);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td20);
    			append_dev(tr5, t56);
    			append_dev(tr5, td21);
    			append_dev(tr5, t58);
    			append_dev(tr5, td22);
    			append_dev(tr5, t60);
    			append_dev(tr5, td23);
    			append_dev(tr5, t62);
    			append_dev(tr5, td24);
    			append_dev(td24, button4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Rank', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Rank> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Rank extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Rank",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\pages\dash\Support.svelte generated by Svelte v3.59.2 */

    const file$1 = "src\\pages\\dash\\Support.svelte";

    function create_fragment$2(ctx) {
    	let section;
    	let div1;
    	let div0;
    	let h3;
    	let t1;
    	let form;
    	let label;
    	let t3;
    	let textarea;
    	let t4;
    	let button;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div1 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Help & Support";
    			t1 = space();
    			form = element("form");
    			label = element("label");
    			label.textContent = "Need Assistance?";
    			t3 = space();
    			textarea = element("textarea");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Send Request";
    			attr_dev(h3, "class", "svelte-10gpo1f");
    			add_location(h3, file$1, 3, 12, 118);
    			attr_dev(label, "for", "support-request");
    			attr_dev(label, "class", "svelte-10gpo1f");
    			add_location(label, file$1, 5, 16, 177);
    			attr_dev(textarea, "id", "support-request");
    			attr_dev(textarea, "name", "support-request");
    			attr_dev(textarea, "rows", "4");
    			attr_dev(textarea, "placeholder", "Describe your issue or request...");
    			attr_dev(textarea, "class", "svelte-10gpo1f");
    			add_location(textarea, file$1, 6, 16, 247);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-10gpo1f");
    			add_location(button, file$1, 7, 16, 386);
    			attr_dev(form, "class", "svelte-10gpo1f");
    			add_location(form, file$1, 4, 12, 154);
    			attr_dev(div0, "class", "settings-section svelte-10gpo1f");
    			add_location(div0, file$1, 2, 8, 75);
    			attr_dev(div1, "class", "settings-content svelte-10gpo1f");
    			add_location(div1, file$1, 1, 4, 36);
    			attr_dev(section, "class", "settings-page svelte-10gpo1f");
    			add_location(section, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, form);
    			append_dev(form, label);
    			append_dev(form, t3);
    			append_dev(form, textarea);
    			append_dev(form, t4);
    			append_dev(form, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Support', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Support> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Support extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Support",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\pages\dash\DashParent.svelte generated by Svelte v3.59.2 */
    const file = "src\\pages\\dash\\DashParent.svelte";

    function create_fragment$1(ctx) {
    	let div1;
    	let aside;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;
    	let nav;
    	let ul;
    	let li0;
    	let a0;
    	let t3;
    	let li1;
    	let a1;
    	let t5;
    	let li2;
    	let a2;
    	let t7;
    	let li3;
    	let a3;
    	let t9;
    	let li4;
    	let a4;
    	let t11;
    	let main;
    	let router;
    	let current;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			aside = element("aside");
    			div0 = element("div");
    			img = element("img");
    			t0 = text("\n            TalentScanAI");
    			t1 = space();
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Manage Resumes";
    			t3 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Rank Resumes";
    			t5 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Support";
    			t7 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "Settings";
    			t9 = space();
    			li4 = element("li");
    			a4 = element("a");
    			a4.textContent = "Logout";
    			t11 = space();
    			main = element("main");
    			create_component(router.$$.fragment);
    			if (!src_url_equal(img.src, img_src_value = "imgs/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Logo");
    			set_style(img, "height", "25px");
    			set_style(img, "width", "45px");
    			attr_dev(img, "class", "svelte-1kczutz");
    			add_location(img, file, 21, 12, 523);
    			attr_dev(div0, "class", "logo svelte-1kczutz");
    			add_location(div0, file, 20, 8, 492);
    			attr_dev(a0, "href", "/#/dash/manage");
    			attr_dev(a0, "class", "svelte-1kczutz");
    			add_location(a0, file, 26, 20, 686);
    			attr_dev(li0, "class", "svelte-1kczutz");
    			add_location(li0, file, 26, 16, 682);
    			attr_dev(a1, "href", "/#/dash/rank");
    			attr_dev(a1, "class", "svelte-1kczutz");
    			add_location(a1, file, 27, 20, 755);
    			attr_dev(li1, "class", "svelte-1kczutz");
    			add_location(li1, file, 27, 16, 751);
    			attr_dev(a2, "href", "/#/dash/support");
    			attr_dev(a2, "class", "svelte-1kczutz");
    			add_location(a2, file, 28, 20, 820);
    			attr_dev(li2, "class", "svelte-1kczutz");
    			add_location(li2, file, 28, 16, 816);
    			attr_dev(a3, "href", "/#/dash/change");
    			attr_dev(a3, "class", "svelte-1kczutz");
    			add_location(a3, file, 29, 20, 883);
    			attr_dev(li3, "class", "svelte-1kczutz");
    			add_location(li3, file, 29, 16, 879);
    			attr_dev(a4, "href", "/#/auth/logout");
    			attr_dev(a4, "class", "svelte-1kczutz");
    			add_location(a4, file, 30, 20, 946);
    			attr_dev(li4, "class", "svelte-1kczutz");
    			add_location(li4, file, 30, 16, 942);
    			attr_dev(ul, "class", "svelte-1kczutz");
    			add_location(ul, file, 25, 12, 661);
    			add_location(nav, file, 24, 8, 643);
    			attr_dev(aside, "class", "sidebar svelte-1kczutz");
    			add_location(aside, file, 19, 4, 460);
    			attr_dev(main, "class", "main-content svelte-1kczutz");
    			add_location(main, file, 34, 4, 1037);
    			attr_dev(div1, "class", "container svelte-1kczutz");
    			add_location(div1, file, 18, 0, 432);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, aside);
    			append_dev(aside, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(aside, t1);
    			append_dev(aside, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(ul, t7);
    			append_dev(ul, li3);
    			append_dev(li3, a3);
    			append_dev(ul, t9);
    			append_dev(ul, li4);
    			append_dev(li4, a4);
    			append_dev(div1, t11);
    			append_dev(div1, main);
    			mount_component(router, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('DashParent', slots, []);

    	const routes = {
    		'/dash/change': Change,
    		'/dash/education': Education,
    		'/dash/manage': Manage,
    		'/dash/rank': Rank,
    		'/dash/support': Support
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DashParent> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		Change,
    		Education,
    		Manage,
    		Rank,
    		Support,
    		routes
    	});

    	return [routes];
    }

    class DashParent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DashParent",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\Router.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $location;
    	validate_store(location, 'location');
    	component_subscribe($$self, location, $$value => $$invalidate(1, $location = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);

    	const routes = {
    		'/auth/*': AuthParent,
    		'/dash/*': DashParent
    	};

    	if ($location == '/') {
    		replace("/auth/login");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		location,
    		replace,
    		AuthParent,
    		DashParent,
    		routes,
    		$location
    	});

    	return [routes];
    }

    class Router_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router_1",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new Router_1({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
