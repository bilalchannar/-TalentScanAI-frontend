
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
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

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.59.2 */

    const { Error: Error_1, Object: Object_1, console: console_1 } = globals;

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

    function create_fragment$b(ctx) {
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
    		id: create_fragment$b.name,
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

    function instance$b($$self, $$props, $$invalidate) {
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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Router> was created with unknown prop '${key}'`);
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

    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$b.name
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

    /* src/pages/auth/Login.svelte generated by Svelte v3.59.2 */

    const file$7 = "src/pages/auth/Login.svelte";

    function create_fragment$a(ctx) {
    	let div3;
    	let header;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;
    	let div2;
    	let h2;
    	let t3;
    	let p0;
    	let t5;
    	let form;
    	let input0;
    	let t6;
    	let input1;
    	let t7;
    	let br;
    	let t8;
    	let button;
    	let t10;
    	let div1;
    	let p1;
    	let t11;
    	let a0;
    	let t13;
    	let a1;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			header = element("header");
    			div0 = element("div");
    			img = element("img");
    			t0 = text("\n            TalentScanAI");
    			t1 = space();
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Welcome Back!";
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Ready to Find the Perfect Candidate?";
    			t5 = space();
    			form = element("form");
    			input0 = element("input");
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			br = element("br");
    			t8 = space();
    			button = element("button");
    			button.textContent = "Login";
    			t10 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t11 = text("Dont have an account? ");
    			a0 = element("a");
    			a0.textContent = "Sign Up";
    			t13 = space();
    			a1 = element("a");
    			a1.textContent = "Forgot Password?";
    			if (!src_url_equal(img.src, img_src_value = "imgs/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Logo");
    			set_style(img, "height", "25px");
    			set_style(img, "width", "45px");
    			add_location(img, file$7, 84, 12, 1830);
    			attr_dev(div0, "class", "logo svelte-bgeass");
    			add_location(div0, file$7, 83, 8, 1799);
    			attr_dev(header, "class", "svelte-bgeass");
    			add_location(header, file$7, 82, 4, 1782);
    			attr_dev(h2, "class", "svelte-bgeass");
    			add_location(h2, file$7, 89, 8, 1996);
    			attr_dev(p0, "class", "svelte-bgeass");
    			add_location(p0, file$7, 90, 8, 2027);
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "name", "email");
    			attr_dev(input0, "placeholder", "Email address");
    			input0.required = true;
    			attr_dev(input0, "class", "svelte-bgeass");
    			add_location(input0, file$7, 92, 12, 2123);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "name", "password");
    			attr_dev(input1, "placeholder", "Password");
    			input1.required = true;
    			attr_dev(input1, "class", "svelte-bgeass");
    			add_location(input1, file$7, 93, 12, 2206);
    			add_location(br, file$7, 94, 12, 2290);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "svelte-bgeass");
    			add_location(button, file$7, 95, 12, 2307);
    			attr_dev(form, "action", "#");
    			attr_dev(form, "method", "POST");
    			attr_dev(form, "class", "svelte-bgeass");
    			add_location(form, file$7, 91, 8, 2079);
    			attr_dev(a0, "href", "/#/auth/signup");
    			attr_dev(a0, "class", "svelte-bgeass");
    			add_location(a0, file$7, 98, 66, 2460);
    			set_style(p1, "margin-bottom", "10px");
    			attr_dev(p1, "class", "svelte-bgeass");
    			add_location(p1, file$7, 98, 12, 2406);
    			attr_dev(a1, "href", "/#/auth/forgot");
    			attr_dev(a1, "class", "svelte-bgeass");
    			add_location(a1, file$7, 99, 12, 2513);
    			attr_dev(div1, "class", "extra-links svelte-bgeass");
    			add_location(div1, file$7, 97, 8, 2368);
    			attr_dev(div2, "class", "login-section svelte-bgeass");
    			add_location(div2, file$7, 88, 4, 1960);
    			attr_dev(div3, "class", "container svelte-bgeass");
    			add_location(div3, file$7, 81, 0, 1754);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, header);
    			append_dev(header, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, h2);
    			append_dev(div2, t3);
    			append_dev(div2, p0);
    			append_dev(div2, t5);
    			append_dev(div2, form);
    			append_dev(form, input0);
    			append_dev(form, t6);
    			append_dev(form, input1);
    			append_dev(form, t7);
    			append_dev(form, br);
    			append_dev(form, t8);
    			append_dev(form, button);
    			append_dev(div2, t10);
    			append_dev(div2, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t11);
    			append_dev(p1, a0);
    			append_dev(div1, t13);
    			append_dev(div1, a1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
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

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/pages/auth/Reset.svelte generated by Svelte v3.59.2 */

    const file$6 = "src/pages/auth/Reset.svelte";

    function create_fragment$9(ctx) {
    	let div3;
    	let header;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;
    	let div2;
    	let h2;
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
    	let div1;
    	let a;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			header = element("header");
    			div0 = element("div");
    			img = element("img");
    			t0 = text("\n            TalentScanAI");
    			t1 = space();
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Reset Password";
    			t3 = space();
    			form = element("form");
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			br = element("br");
    			t6 = space();
    			button = element("button");
    			button.textContent = "Reset Password";
    			t8 = space();
    			div1 = element("div");
    			a = element("a");
    			a.textContent = "← Go Back to Login";
    			if (!src_url_equal(img.src, img_src_value = "imgs/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Logo");
    			set_style(img, "height", "25px");
    			set_style(img, "width", "45px");
    			add_location(img, file$6, 79, 12, 1741);
    			attr_dev(div0, "class", "logo svelte-1t4y4p7");
    			add_location(div0, file$6, 78, 8, 1710);
    			attr_dev(header, "class", "svelte-1t4y4p7");
    			add_location(header, file$6, 77, 4, 1693);
    			attr_dev(h2, "class", "svelte-1t4y4p7");
    			add_location(h2, file$6, 84, 8, 1907);
    			attr_dev(input0, "type", "password");
    			attr_dev(input0, "placeholder", "New password");
    			input0.required = true;
    			attr_dev(input0, "class", "svelte-1t4y4p7");
    			add_location(input0, file$6, 86, 12, 1983);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "Confirm password");
    			input1.required = true;
    			attr_dev(input1, "class", "svelte-1t4y4p7");
    			add_location(input1, file$6, 87, 12, 2055);
    			add_location(br, file$6, 88, 12, 2131);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "svelte-1t4y4p7");
    			add_location(button, file$6, 89, 12, 2148);
    			attr_dev(form, "action", "#");
    			attr_dev(form, "method", "POST");
    			attr_dev(form, "class", "svelte-1t4y4p7");
    			add_location(form, file$6, 85, 8, 1939);
    			attr_dev(a, "href", "/#/auth/login");
    			attr_dev(a, "class", "svelte-1t4y4p7");
    			add_location(a, file$6, 92, 12, 2256);
    			attr_dev(div1, "class", "extra-links svelte-1t4y4p7");
    			add_location(div1, file$6, 91, 8, 2218);
    			attr_dev(div2, "class", "login-section svelte-1t4y4p7");
    			add_location(div2, file$6, 83, 4, 1871);
    			attr_dev(div3, "class", "container svelte-1t4y4p7");
    			add_location(div3, file$6, 76, 0, 1665);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, header);
    			append_dev(header, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, h2);
    			append_dev(div2, t3);
    			append_dev(div2, form);
    			append_dev(form, input0);
    			append_dev(form, t4);
    			append_dev(form, input1);
    			append_dev(form, t5);
    			append_dev(form, br);
    			append_dev(form, t6);
    			append_dev(form, button);
    			append_dev(div2, t8);
    			append_dev(div2, div1);
    			append_dev(div1, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
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

    /* src/pages/auth/Signup.svelte generated by Svelte v3.59.2 */

    const file$5 = "src/pages/auth/Signup.svelte";

    function create_fragment$8(ctx) {
    	let div3;
    	let header;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let t1;
    	let div2;
    	let section;
    	let h2;
    	let t3;
    	let p0;
    	let t5;
    	let form;
    	let input0;
    	let t6;
    	let input1;
    	let t7;
    	let input2;
    	let t8;
    	let input3;
    	let t9;
    	let button;
    	let t11;
    	let div1;
    	let p1;
    	let t12;
    	let a;
    	let t14;
    	let aside;
    	let img1;
    	let img1_src_value;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			header = element("header");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = text("\n            TalentScanAI");
    			t1 = space();
    			div2 = element("div");
    			section = element("section");
    			h2 = element("h2");
    			h2.textContent = "Join the Future of Recruitment";
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Sign Up and Unlock Smarter Hiring";
    			t5 = space();
    			form = element("form");
    			input0 = element("input");
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			input2 = element("input");
    			t8 = space();
    			input3 = element("input");
    			t9 = space();
    			button = element("button");
    			button.textContent = "Sign Up";
    			t11 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t12 = text("Already have an account? ");
    			a = element("a");
    			a.textContent = "Log in";
    			t14 = space();
    			aside = element("aside");
    			img1 = element("img");
    			if (!src_url_equal(img0.src, img0_src_value = "imgs/logo.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			set_style(img0, "height", "35px");
    			set_style(img0, "width", "45px");
    			set_style(img0, "margin-left", "10px");
    			add_location(img0, file$5, 81, 12, 1769);
    			attr_dev(div0, "class", "logo svelte-fnlabw");
    			add_location(div0, file$5, 80, 8, 1738);
    			attr_dev(header, "class", "svelte-fnlabw");
    			add_location(header, file$5, 79, 4, 1721);
    			attr_dev(h2, "class", "svelte-fnlabw");
    			add_location(h2, file$5, 87, 12, 1998);
    			attr_dev(p0, "class", "svelte-fnlabw");
    			add_location(p0, file$5, 88, 12, 2050);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Full Name");
    			input0.required = true;
    			attr_dev(input0, "class", "svelte-fnlabw");
    			add_location(input0, file$5, 90, 16, 2126);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "placeholder", "Email");
    			input1.required = true;
    			attr_dev(input1, "class", "svelte-fnlabw");
    			add_location(input1, file$5, 91, 16, 2195);
    			attr_dev(input2, "type", "password");
    			attr_dev(input2, "placeholder", "Password");
    			input2.required = true;
    			attr_dev(input2, "class", "svelte-fnlabw");
    			add_location(input2, file$5, 92, 16, 2261);
    			attr_dev(input3, "type", "password");
    			attr_dev(input3, "placeholder", "Confirm Password");
    			input3.required = true;
    			attr_dev(input3, "class", "svelte-fnlabw");
    			add_location(input3, file$5, 93, 16, 2333);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-fnlabw");
    			add_location(button, file$5, 94, 16, 2413);
    			attr_dev(form, "class", "svelte-fnlabw");
    			add_location(form, file$5, 89, 12, 2103);
    			attr_dev(a, "href", "/#/auth/login");
    			attr_dev(a, "class", "svelte-fnlabw");
    			add_location(a, file$5, 97, 44, 2554);
    			attr_dev(p1, "class", "svelte-fnlabw");
    			add_location(p1, file$5, 97, 16, 2526);
    			attr_dev(div1, "class", "extra-links svelte-fnlabw");
    			add_location(div1, file$5, 96, 12, 2484);
    			attr_dev(section, "class", "signup-section svelte-fnlabw");
    			add_location(section, file$5, 86, 8, 1953);
    			if (!src_url_equal(img1.src, img1_src_value = "imgs/front.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Teamwork Illustration");
    			attr_dev(img1, "class", "svelte-fnlabw");
    			add_location(img1, file$5, 101, 12, 2681);
    			attr_dev(aside, "class", "image-section svelte-fnlabw");
    			add_location(aside, file$5, 100, 8, 2639);
    			attr_dev(div2, "class", "main-content svelte-fnlabw");
    			add_location(div2, file$5, 85, 4, 1918);
    			attr_dev(div3, "class", "container svelte-fnlabw");
    			add_location(div3, file$5, 78, 0, 1693);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, header);
    			append_dev(header, div0);
    			append_dev(div0, img0);
    			append_dev(div0, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, section);
    			append_dev(section, h2);
    			append_dev(section, t3);
    			append_dev(section, p0);
    			append_dev(section, t5);
    			append_dev(section, form);
    			append_dev(form, input0);
    			append_dev(form, t6);
    			append_dev(form, input1);
    			append_dev(form, t7);
    			append_dev(form, input2);
    			append_dev(form, t8);
    			append_dev(form, input3);
    			append_dev(form, t9);
    			append_dev(form, button);
    			append_dev(section, t11);
    			append_dev(section, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t12);
    			append_dev(p1, a);
    			append_dev(div2, t14);
    			append_dev(div2, aside);
    			append_dev(aside, img1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
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

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Signup', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Signup> was created with unknown prop '${key}'`);
    	});

    	return [];
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

    /* src/pages/auth/Forgot.svelte generated by Svelte v3.59.2 */

    const file$4 = "src/pages/auth/Forgot.svelte";

    function create_fragment$7(ctx) {
    	let div3;
    	let header;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;
    	let div2;
    	let h2;
    	let t3;
    	let form;
    	let input;
    	let t4;
    	let br;
    	let t5;
    	let button;
    	let t7;
    	let div1;
    	let a;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			header = element("header");
    			div0 = element("div");
    			img = element("img");
    			t0 = text("\n            TalentScanAI");
    			t1 = space();
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Forgot Password";
    			t3 = space();
    			form = element("form");
    			input = element("input");
    			t4 = space();
    			br = element("br");
    			t5 = space();
    			button = element("button");
    			button.textContent = "Send Password Reset Email";
    			t7 = space();
    			div1 = element("div");
    			a = element("a");
    			a.textContent = "← Go Back to Login";
    			if (!src_url_equal(img.src, img_src_value = "imgs/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Logo");
    			set_style(img, "height", "25px");
    			set_style(img, "width", "45px");
    			add_location(img, file$4, 79, 12, 1741);
    			attr_dev(div0, "class", "logo svelte-1t4y4p7");
    			add_location(div0, file$4, 78, 8, 1710);
    			attr_dev(header, "class", "svelte-1t4y4p7");
    			add_location(header, file$4, 77, 4, 1693);
    			attr_dev(h2, "class", "svelte-1t4y4p7");
    			add_location(h2, file$4, 84, 8, 1907);
    			attr_dev(input, "type", "email");
    			attr_dev(input, "name", "email");
    			attr_dev(input, "placeholder", "Email address");
    			input.required = true;
    			attr_dev(input, "class", "svelte-1t4y4p7");
    			add_location(input, file$4, 86, 12, 1984);
    			add_location(br, file$4, 87, 12, 2067);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "svelte-1t4y4p7");
    			add_location(button, file$4, 88, 12, 2084);
    			attr_dev(form, "action", "#");
    			attr_dev(form, "method", "POST");
    			attr_dev(form, "class", "svelte-1t4y4p7");
    			add_location(form, file$4, 85, 8, 1940);
    			attr_dev(a, "href", "/#/auth/login");
    			attr_dev(a, "class", "svelte-1t4y4p7");
    			add_location(a, file$4, 91, 12, 2203);
    			attr_dev(div1, "class", "extra-links svelte-1t4y4p7");
    			add_location(div1, file$4, 90, 8, 2165);
    			attr_dev(div2, "class", "login-section svelte-1t4y4p7");
    			add_location(div2, file$4, 83, 4, 1871);
    			attr_dev(div3, "class", "container svelte-1t4y4p7");
    			add_location(div3, file$4, 76, 0, 1665);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, header);
    			append_dev(header, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, h2);
    			append_dev(div2, t3);
    			append_dev(div2, form);
    			append_dev(form, input);
    			append_dev(form, t4);
    			append_dev(form, br);
    			append_dev(form, t5);
    			append_dev(form, button);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			append_dev(div1, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
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

    function instance$7($$self, $$props) {
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Forgot",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/pages/auth/Logout.svelte generated by Svelte v3.59.2 */

    function create_fragment$6(ctx) {
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logout",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/pages/dash/Rank.svelte generated by Svelte v3.59.2 */

    const file$3 = "src/pages/dash/Rank.svelte";

    function create_fragment$5(ctx) {
    	let div4;
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
    	let header;
    	let h1;
    	let t13;
    	let div2;
    	let div1;
    	let h2;
    	let t15;
    	let textarea;
    	let t16;
    	let section;
    	let div3;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t18;
    	let th1;
    	let t20;
    	let th2;
    	let t22;
    	let th3;
    	let t24;
    	let th4;
    	let t26;
    	let tbody;
    	let tr1;
    	let td0;
    	let t28;
    	let td1;
    	let t30;
    	let td2;
    	let t32;
    	let td3;
    	let t34;
    	let td4;
    	let button0;
    	let t36;
    	let tr2;
    	let td5;
    	let t38;
    	let td6;
    	let t40;
    	let td7;
    	let t42;
    	let td8;
    	let t44;
    	let td9;
    	let button1;
    	let t46;
    	let tr3;
    	let td10;
    	let t48;
    	let td11;
    	let t50;
    	let td12;
    	let t52;
    	let td13;
    	let t54;
    	let td14;
    	let button2;

    	const block = {
    		c: function create() {
    			div4 = element("div");
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
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Rank Resumes";
    			t13 = space();
    			div2 = element("div");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Enter Job Description";
    			t15 = space();
    			textarea = element("textarea");
    			t16 = space();
    			section = element("section");
    			div3 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Rank";
    			t18 = space();
    			th1 = element("th");
    			th1.textContent = "Name";
    			t20 = space();
    			th2 = element("th");
    			th2.textContent = "Skills";
    			t22 = space();
    			th3 = element("th");
    			th3.textContent = "Ranking";
    			t24 = space();
    			th4 = element("th");
    			th4.textContent = "Actions";
    			t26 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "1";
    			t28 = space();
    			td1 = element("td");
    			td1.textContent = "John Doe";
    			t30 = space();
    			td2 = element("td");
    			td2.textContent = "Java, Python, SQL";
    			t32 = space();
    			td3 = element("td");
    			td3.textContent = "95";
    			t34 = space();
    			td4 = element("td");
    			button0 = element("button");
    			button0.textContent = "View Reasoning";
    			t36 = space();
    			tr2 = element("tr");
    			td5 = element("td");
    			td5.textContent = "2";
    			t38 = space();
    			td6 = element("td");
    			td6.textContent = "Michael Johnson";
    			t40 = space();
    			td7 = element("td");
    			td7.textContent = "JavaScript, Node.js, HTML";
    			t42 = space();
    			td8 = element("td");
    			td8.textContent = "90";
    			t44 = space();
    			td9 = element("td");
    			button1 = element("button");
    			button1.textContent = "View Reasoning";
    			t46 = space();
    			tr3 = element("tr");
    			td10 = element("td");
    			td10.textContent = "3";
    			t48 = space();
    			td11 = element("td");
    			td11.textContent = "Jane Smith";
    			t50 = space();
    			td12 = element("td");
    			td12.textContent = "HTML, CSS, JavaScript";
    			t52 = space();
    			td13 = element("td");
    			td13.textContent = "88";
    			t54 = space();
    			td14 = element("td");
    			button2 = element("button");
    			button2.textContent = "View Reasoning";
    			if (!src_url_equal(img.src, img_src_value = "imgs/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Logo");
    			set_style(img, "height", "25px");
    			set_style(img, "width", "45px");
    			add_location(img, file$3, 169, 12, 2763);
    			attr_dev(div0, "class", "logo svelte-1t7cpvm");
    			add_location(div0, file$3, 168, 8, 2732);
    			attr_dev(a0, "href", "/#/dash/manage");
    			attr_dev(a0, "class", "svelte-1t7cpvm");
    			add_location(a0, file$3, 174, 16, 2920);
    			attr_dev(li0, "class", "svelte-1t7cpvm");
    			add_location(li0, file$3, 174, 12, 2916);
    			attr_dev(a1, "href", "/#/dash/rank");
    			attr_dev(a1, "class", "svelte-1t7cpvm");
    			add_location(a1, file$3, 175, 16, 2985);
    			attr_dev(li1, "class", "svelte-1t7cpvm");
    			add_location(li1, file$3, 175, 12, 2981);
    			attr_dev(a2, "href", "/#/dash/support");
    			attr_dev(a2, "class", "svelte-1t7cpvm");
    			add_location(a2, file$3, 176, 16, 3046);
    			attr_dev(li2, "class", "svelte-1t7cpvm");
    			add_location(li2, file$3, 176, 12, 3042);
    			attr_dev(a3, "href", "/#/dash/change");
    			attr_dev(a3, "class", "svelte-1t7cpvm");
    			add_location(a3, file$3, 177, 16, 3105);
    			attr_dev(li3, "class", "svelte-1t7cpvm");
    			add_location(li3, file$3, 177, 12, 3101);
    			attr_dev(a4, "href", "/#/auth/logout");
    			attr_dev(a4, "class", "svelte-1t7cpvm");
    			add_location(a4, file$3, 178, 16, 3164);
    			attr_dev(li4, "class", "svelte-1t7cpvm");
    			add_location(li4, file$3, 178, 12, 3160);
    			attr_dev(ul, "class", "svelte-1t7cpvm");
    			add_location(ul, file$3, 173, 10, 2899);
    			attr_dev(nav, "class", "svelte-1t7cpvm");
    			add_location(nav, file$3, 172, 8, 2883);
    			attr_dev(aside, "class", "sidebar svelte-1t7cpvm");
    			add_location(aside, file$3, 167, 4, 2700);
    			add_location(h1, file$3, 184, 12, 3352);
    			set_style(header, "display", "flex");
    			set_style(header, "align-items", "center");
    			attr_dev(header, "class", "svelte-1t7cpvm");
    			add_location(header, file$3, 183, 8, 3287);
    			add_location(h2, file$3, 188, 16, 3484);
    			attr_dev(textarea, "placeholder", "Copy-paste or type it here...");
    			attr_dev(textarea, "rows", "10");
    			set_style(textarea, "width", "100%");
    			set_style(textarea, "padding", "10px");
    			set_style(textarea, "border", "1px solid #ddd");
    			set_style(textarea, "border-radius", "5px");
    			attr_dev(textarea, "class", "svelte-1t7cpvm");
    			add_location(textarea, file$3, 189, 16, 3531);
    			attr_dev(div1, "class", "job-description svelte-1t7cpvm");
    			add_location(div1, file$3, 187, 12, 3438);
    			attr_dev(div2, "class", "job-section svelte-1t7cpvm");
    			add_location(div2, file$3, 186, 8, 3400);
    			attr_dev(th0, "class", "svelte-1t7cpvm");
    			add_location(th0, file$3, 197, 28, 3904);
    			attr_dev(th1, "class", "svelte-1t7cpvm");
    			add_location(th1, file$3, 198, 28, 3946);
    			attr_dev(th2, "class", "svelte-1t7cpvm");
    			add_location(th2, file$3, 199, 28, 3988);
    			attr_dev(th3, "class", "svelte-1t7cpvm");
    			add_location(th3, file$3, 200, 28, 4032);
    			attr_dev(th4, "class", "svelte-1t7cpvm");
    			add_location(th4, file$3, 201, 28, 4077);
    			add_location(tr0, file$3, 196, 24, 3871);
    			add_location(thead, file$3, 195, 20, 3839);
    			attr_dev(td0, "class", "svelte-1t7cpvm");
    			add_location(td0, file$3, 206, 28, 4238);
    			attr_dev(td1, "class", "svelte-1t7cpvm");
    			add_location(td1, file$3, 207, 28, 4277);
    			attr_dev(td2, "class", "svelte-1t7cpvm");
    			add_location(td2, file$3, 208, 28, 4323);
    			attr_dev(td3, "class", "svelte-1t7cpvm");
    			add_location(td3, file$3, 209, 28, 4378);
    			attr_dev(button0, "class", "svelte-1t7cpvm");
    			add_location(button0, file$3, 210, 32, 4422);
    			attr_dev(td4, "class", "svelte-1t7cpvm");
    			add_location(td4, file$3, 210, 28, 4418);
    			add_location(tr1, file$3, 205, 24, 4205);
    			attr_dev(td5, "class", "svelte-1t7cpvm");
    			add_location(td5, file$3, 213, 28, 4546);
    			attr_dev(td6, "class", "svelte-1t7cpvm");
    			add_location(td6, file$3, 214, 28, 4585);
    			attr_dev(td7, "class", "svelte-1t7cpvm");
    			add_location(td7, file$3, 215, 28, 4638);
    			attr_dev(td8, "class", "svelte-1t7cpvm");
    			add_location(td8, file$3, 216, 28, 4701);
    			attr_dev(button1, "class", "svelte-1t7cpvm");
    			add_location(button1, file$3, 217, 32, 4745);
    			attr_dev(td9, "class", "svelte-1t7cpvm");
    			add_location(td9, file$3, 217, 28, 4741);
    			add_location(tr2, file$3, 212, 24, 4513);
    			attr_dev(td10, "class", "svelte-1t7cpvm");
    			add_location(td10, file$3, 220, 28, 4869);
    			attr_dev(td11, "class", "svelte-1t7cpvm");
    			add_location(td11, file$3, 221, 28, 4908);
    			attr_dev(td12, "class", "svelte-1t7cpvm");
    			add_location(td12, file$3, 222, 28, 4956);
    			attr_dev(td13, "class", "svelte-1t7cpvm");
    			add_location(td13, file$3, 223, 28, 5015);
    			attr_dev(button2, "class", "svelte-1t7cpvm");
    			add_location(button2, file$3, 224, 32, 5059);
    			attr_dev(td14, "class", "svelte-1t7cpvm");
    			add_location(td14, file$3, 224, 28, 5055);
    			add_location(tr3, file$3, 219, 24, 4836);
    			add_location(tbody, file$3, 204, 20, 4173);
    			attr_dev(table, "class", "svelte-1t7cpvm");
    			add_location(table, file$3, 194, 16, 3811);
    			attr_dev(div3, "class", "table-section svelte-1t7cpvm");
    			add_location(div3, file$3, 193, 12, 3767);
    			attr_dev(section, "class", "content svelte-1t7cpvm");
    			add_location(section, file$3, 192, 8, 3729);
    			attr_dev(main, "class", "main-content svelte-1t7cpvm");
    			add_location(main, file$3, 182, 4, 3251);
    			attr_dev(div4, "class", "dashboard-container svelte-1t7cpvm");
    			add_location(div4, file$3, 166, 0, 2662);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, aside);
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
    			append_dev(div4, t11);
    			append_dev(div4, main);
    			append_dev(main, header);
    			append_dev(header, h1);
    			append_dev(main, t13);
    			append_dev(main, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t15);
    			append_dev(div1, textarea);
    			append_dev(main, t16);
    			append_dev(main, section);
    			append_dev(section, div3);
    			append_dev(div3, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t18);
    			append_dev(tr0, th1);
    			append_dev(tr0, t20);
    			append_dev(tr0, th2);
    			append_dev(tr0, t22);
    			append_dev(tr0, th3);
    			append_dev(tr0, t24);
    			append_dev(tr0, th4);
    			append_dev(table, t26);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t28);
    			append_dev(tr1, td1);
    			append_dev(tr1, t30);
    			append_dev(tr1, td2);
    			append_dev(tr1, t32);
    			append_dev(tr1, td3);
    			append_dev(tr1, t34);
    			append_dev(tr1, td4);
    			append_dev(td4, button0);
    			append_dev(tbody, t36);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td5);
    			append_dev(tr2, t38);
    			append_dev(tr2, td6);
    			append_dev(tr2, t40);
    			append_dev(tr2, td7);
    			append_dev(tr2, t42);
    			append_dev(tr2, td8);
    			append_dev(tr2, t44);
    			append_dev(tr2, td9);
    			append_dev(td9, button1);
    			append_dev(tbody, t46);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td10);
    			append_dev(tr3, t48);
    			append_dev(tr3, td11);
    			append_dev(tr3, t50);
    			append_dev(tr3, td12);
    			append_dev(tr3, t52);
    			append_dev(tr3, td13);
    			append_dev(tr3, t54);
    			append_dev(tr3, td14);
    			append_dev(td14, button2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Rank",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/pages/dash/Change.svelte generated by Svelte v3.59.2 */

    const file$2 = "src/pages/dash/Change.svelte";

    function create_fragment$4(ctx) {
    	let div3;
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
    	let section;
    	let div2;
    	let div1;
    	let h3;
    	let t13;
    	let form;
    	let input0;
    	let t14;
    	let input1;
    	let t15;
    	let input2;
    	let t16;
    	let button;

    	const block = {
    		c: function create() {
    			div3 = element("div");
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
    			section = element("section");
    			div2 = element("div");
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Change Password";
    			t13 = space();
    			form = element("form");
    			input0 = element("input");
    			t14 = space();
    			input1 = element("input");
    			t15 = space();
    			input2 = element("input");
    			t16 = space();
    			button = element("button");
    			button.textContent = "Change Password";
    			if (!src_url_equal(img.src, img_src_value = "imgs/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Logo");
    			set_style(img, "height", "25px");
    			set_style(img, "width", "45px");
    			attr_dev(img, "class", "svelte-fh55fz");
    			add_location(img, file$2, 126, 12, 2478);
    			attr_dev(div0, "class", "logo svelte-fh55fz");
    			add_location(div0, file$2, 125, 8, 2447);
    			attr_dev(a0, "href", "/#/dash/manage");
    			attr_dev(a0, "class", "svelte-fh55fz");
    			add_location(a0, file$2, 131, 20, 2641);
    			attr_dev(li0, "class", "svelte-fh55fz");
    			add_location(li0, file$2, 131, 16, 2637);
    			attr_dev(a1, "href", "/#/dash/rank");
    			attr_dev(a1, "class", "svelte-fh55fz");
    			add_location(a1, file$2, 132, 20, 2710);
    			attr_dev(li1, "class", "svelte-fh55fz");
    			add_location(li1, file$2, 132, 16, 2706);
    			attr_dev(a2, "href", "/#/dash/support");
    			attr_dev(a2, "class", "svelte-fh55fz");
    			add_location(a2, file$2, 133, 20, 2775);
    			attr_dev(li2, "class", "svelte-fh55fz");
    			add_location(li2, file$2, 133, 16, 2771);
    			attr_dev(a3, "href", "/#/dash/change");
    			attr_dev(a3, "class", "svelte-fh55fz");
    			add_location(a3, file$2, 134, 20, 2838);
    			attr_dev(li3, "class", "svelte-fh55fz");
    			add_location(li3, file$2, 134, 16, 2834);
    			attr_dev(a4, "href", "/#/auth/logout");
    			attr_dev(a4, "class", "svelte-fh55fz");
    			add_location(a4, file$2, 135, 20, 2901);
    			attr_dev(li4, "class", "svelte-fh55fz");
    			add_location(li4, file$2, 135, 16, 2897);
    			attr_dev(ul, "class", "svelte-fh55fz");
    			add_location(ul, file$2, 130, 12, 2616);
    			add_location(nav, file$2, 129, 8, 2598);
    			attr_dev(aside, "class", "sidebar svelte-fh55fz");
    			add_location(aside, file$2, 124, 4, 2415);
    			attr_dev(h3, "class", "svelte-fh55fz");
    			add_location(h3, file$2, 143, 20, 3170);
    			attr_dev(input0, "type", "password");
    			attr_dev(input0, "name", "email");
    			attr_dev(input0, "placeholder", "Old Password");
    			input0.required = true;
    			attr_dev(input0, "class", "svelte-fh55fz");
    			add_location(input0, file$2, 145, 24, 3246);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "name", "password");
    			attr_dev(input1, "placeholder", "New Password");
    			input1.required = true;
    			attr_dev(input1, "class", "svelte-fh55fz");
    			add_location(input1, file$2, 146, 24, 3343);
    			attr_dev(input2, "type", "password");
    			attr_dev(input2, "name", "password");
    			attr_dev(input2, "placeholder", "Confirm Password");
    			input2.required = true;
    			attr_dev(input2, "class", "svelte-fh55fz");
    			add_location(input2, file$2, 147, 24, 3443);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-fh55fz");
    			add_location(button, file$2, 148, 24, 3547);
    			attr_dev(form, "class", "svelte-fh55fz");
    			add_location(form, file$2, 144, 20, 3215);
    			attr_dev(div1, "class", "settings-section svelte-fh55fz");
    			add_location(div1, file$2, 142, 16, 3119);
    			attr_dev(div2, "class", "settings-content svelte-fh55fz");
    			add_location(div2, file$2, 141, 12, 3072);
    			attr_dev(section, "class", "settings-page svelte-fh55fz");
    			add_location(section, file$2, 140, 8, 3028);
    			attr_dev(main, "class", "main-content svelte-fh55fz");
    			add_location(main, file$2, 139, 4, 2992);
    			attr_dev(div3, "class", "dashboard-container svelte-fh55fz");
    			add_location(div3, file$2, 123, 0, 2377);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, aside);
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
    			append_dev(div3, t11);
    			append_dev(div3, main);
    			append_dev(main, section);
    			append_dev(section, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h3);
    			append_dev(div1, t13);
    			append_dev(div1, form);
    			append_dev(form, input0);
    			append_dev(form, t14);
    			append_dev(form, input1);
    			append_dev(form, t15);
    			append_dev(form, input2);
    			append_dev(form, t16);
    			append_dev(form, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Change",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/pages/dash/Manage.svelte generated by Svelte v3.59.2 */

    const file$1 = "src/pages/dash/Manage.svelte";

    function create_fragment$3(ctx) {
    	let div4;
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
    	let header;
    	let h1;
    	let t13;
    	let div2;
    	let button0;
    	let t15;
    	let div1;
    	let h3;
    	let t17;
    	let p;
    	let t19;
    	let section;
    	let div3;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t21;
    	let th1;
    	let t23;
    	let th2;
    	let t25;
    	let th3;
    	let t27;
    	let tbody;
    	let tr1;
    	let td0;
    	let t29;
    	let td1;
    	let t31;
    	let td2;
    	let t33;
    	let td3;
    	let button1;
    	let t35;
    	let button2;
    	let t37;
    	let tr2;
    	let td4;
    	let t39;
    	let td5;
    	let t41;
    	let td6;
    	let t43;
    	let td7;
    	let button3;
    	let t45;
    	let button4;
    	let t47;
    	let tr3;
    	let td8;
    	let t49;
    	let td9;
    	let t51;
    	let td10;
    	let t53;
    	let td11;
    	let button5;
    	let t55;
    	let button6;

    	const block = {
    		c: function create() {
    			div4 = element("div");
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
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Manage Resumes";
    			t13 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "Upload";
    			t15 = space();
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Total Resumes Uploaded";
    			t17 = space();
    			p = element("p");
    			p.textContent = "7";
    			t19 = space();
    			section = element("section");
    			div3 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Candidate Name";
    			t21 = space();
    			th1 = element("th");
    			th1.textContent = "Resume File";
    			t23 = space();
    			th2 = element("th");
    			th2.textContent = "Upload Date";
    			t25 = space();
    			th3 = element("th");
    			th3.textContent = "Action";
    			t27 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "John Doe";
    			t29 = space();
    			td1 = element("td");
    			td1.textContent = "john_doe_resume.pdf";
    			t31 = space();
    			td2 = element("td");
    			td2.textContent = "2024-11-25";
    			t33 = space();
    			td3 = element("td");
    			button1 = element("button");
    			button1.textContent = "Analyse";
    			t35 = space();
    			button2 = element("button");
    			button2.textContent = "Delete";
    			t37 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "John Doe";
    			t39 = space();
    			td5 = element("td");
    			td5.textContent = "john_doe_resume.pdf";
    			t41 = space();
    			td6 = element("td");
    			td6.textContent = "2024-11-25";
    			t43 = space();
    			td7 = element("td");
    			button3 = element("button");
    			button3.textContent = "Analyse";
    			t45 = space();
    			button4 = element("button");
    			button4.textContent = "Delete";
    			t47 = space();
    			tr3 = element("tr");
    			td8 = element("td");
    			td8.textContent = "John Doe";
    			t49 = space();
    			td9 = element("td");
    			td9.textContent = "john_doe_resume.pdf";
    			t51 = space();
    			td10 = element("td");
    			td10.textContent = "2024-11-25";
    			t53 = space();
    			td11 = element("td");
    			button5 = element("button");
    			button5.textContent = "Analyse";
    			t55 = space();
    			button6 = element("button");
    			button6.textContent = "Delete";
    			if (!src_url_equal(img.src, img_src_value = "imgs/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Logo");
    			set_style(img, "height", "25px");
    			set_style(img, "width", "45px");
    			add_location(img, file$1, 154, 12, 3358);
    			attr_dev(div0, "class", "logo svelte-d5sl0s");
    			add_location(div0, file$1, 153, 8, 3327);
    			attr_dev(a0, "href", "/#/dash/manage");
    			attr_dev(a0, "class", "svelte-d5sl0s");
    			add_location(a0, file$1, 159, 20, 3521);
    			attr_dev(li0, "class", "svelte-d5sl0s");
    			add_location(li0, file$1, 159, 16, 3517);
    			attr_dev(a1, "href", "/#/dash/rank");
    			attr_dev(a1, "class", "svelte-d5sl0s");
    			add_location(a1, file$1, 160, 20, 3590);
    			attr_dev(li1, "class", "svelte-d5sl0s");
    			add_location(li1, file$1, 160, 16, 3586);
    			attr_dev(a2, "href", "/#/dash/support");
    			attr_dev(a2, "class", "svelte-d5sl0s");
    			add_location(a2, file$1, 161, 20, 3655);
    			attr_dev(li2, "class", "svelte-d5sl0s");
    			add_location(li2, file$1, 161, 16, 3651);
    			attr_dev(a3, "href", "/#/dash/change");
    			attr_dev(a3, "class", "svelte-d5sl0s");
    			add_location(a3, file$1, 162, 20, 3718);
    			attr_dev(li3, "class", "svelte-d5sl0s");
    			add_location(li3, file$1, 162, 16, 3714);
    			attr_dev(a4, "href", "/#/auth/logout");
    			attr_dev(a4, "class", "svelte-d5sl0s");
    			add_location(a4, file$1, 163, 20, 3781);
    			attr_dev(li4, "class", "svelte-d5sl0s");
    			add_location(li4, file$1, 163, 16, 3777);
    			attr_dev(ul, "class", "svelte-d5sl0s");
    			add_location(ul, file$1, 158, 12, 3496);
    			add_location(nav, file$1, 157, 8, 3478);
    			attr_dev(aside, "class", "sidebar svelte-d5sl0s");
    			add_location(aside, file$1, 152, 4, 3295);
    			attr_dev(h1, "class", "svelte-d5sl0s");
    			add_location(h1, file$1, 169, 12, 3973);
    			set_style(button0, "width", "100px");
    			set_style(button0, "border-radius", "10px");
    			set_style(button0, "border", "none");
    			set_style(button0, "background-color", "lightgray");
    			add_location(button0, file$1, 171, 16, 4045);
    			attr_dev(h3, "class", "svelte-d5sl0s");
    			add_location(h3, file$1, 173, 20, 4213);
    			attr_dev(p, "class", "svelte-d5sl0s");
    			add_location(p, file$1, 174, 20, 4265);
    			attr_dev(div1, "class", "stat-box svelte-d5sl0s");
    			add_location(div1, file$1, 172, 16, 4170);
    			attr_dev(div2, "class", "stats svelte-d5sl0s");
    			add_location(div2, file$1, 170, 12, 4009);
    			set_style(header, "display", "flex");
    			set_style(header, "align-items", "center");
    			attr_dev(header, "class", "svelte-d5sl0s");
    			add_location(header, file$1, 168, 8, 3908);
    			attr_dev(th0, "class", "svelte-d5sl0s");
    			add_location(th0, file$1, 183, 28, 4516);
    			attr_dev(th1, "class", "svelte-d5sl0s");
    			add_location(th1, file$1, 184, 28, 4568);
    			attr_dev(th2, "class", "svelte-d5sl0s");
    			add_location(th2, file$1, 185, 28, 4617);
    			attr_dev(th3, "class", "svelte-d5sl0s");
    			add_location(th3, file$1, 186, 28, 4666);
    			add_location(tr0, file$1, 182, 24, 4483);
    			add_location(thead, file$1, 181, 20, 4451);
    			attr_dev(td0, "class", "svelte-d5sl0s");
    			add_location(td0, file$1, 191, 28, 4826);
    			attr_dev(td1, "class", "svelte-d5sl0s");
    			add_location(td1, file$1, 192, 28, 4872);
    			attr_dev(td2, "class", "svelte-d5sl0s");
    			add_location(td2, file$1, 193, 28, 4929);
    			attr_dev(button1, "class", "svelte-d5sl0s");
    			add_location(button1, file$1, 195, 32, 5014);
    			set_style(button2, "background-color", "red");
    			attr_dev(button2, "class", "svelte-d5sl0s");
    			add_location(button2, file$1, 196, 32, 5071);
    			attr_dev(td3, "class", "svelte-d5sl0s");
    			add_location(td3, file$1, 194, 28, 4977);
    			add_location(tr1, file$1, 190, 24, 4793);
    			attr_dev(td4, "class", "svelte-d5sl0s");
    			add_location(td4, file$1, 200, 28, 5247);
    			attr_dev(td5, "class", "svelte-d5sl0s");
    			add_location(td5, file$1, 201, 28, 5293);
    			attr_dev(td6, "class", "svelte-d5sl0s");
    			add_location(td6, file$1, 202, 28, 5350);
    			attr_dev(button3, "class", "svelte-d5sl0s");
    			add_location(button3, file$1, 204, 32, 5435);
    			set_style(button4, "background-color", "red");
    			attr_dev(button4, "class", "svelte-d5sl0s");
    			add_location(button4, file$1, 205, 32, 5492);
    			attr_dev(td7, "class", "svelte-d5sl0s");
    			add_location(td7, file$1, 203, 28, 5398);
    			add_location(tr2, file$1, 199, 24, 5214);
    			attr_dev(td8, "class", "svelte-d5sl0s");
    			add_location(td8, file$1, 209, 28, 5668);
    			attr_dev(td9, "class", "svelte-d5sl0s");
    			add_location(td9, file$1, 210, 28, 5714);
    			attr_dev(td10, "class", "svelte-d5sl0s");
    			add_location(td10, file$1, 211, 28, 5771);
    			attr_dev(button5, "class", "svelte-d5sl0s");
    			add_location(button5, file$1, 213, 32, 5856);
    			set_style(button6, "background-color", "red");
    			attr_dev(button6, "class", "svelte-d5sl0s");
    			add_location(button6, file$1, 214, 32, 5913);
    			attr_dev(td11, "class", "svelte-d5sl0s");
    			add_location(td11, file$1, 212, 28, 5819);
    			add_location(tr3, file$1, 208, 24, 5635);
    			add_location(tbody, file$1, 189, 20, 4761);
    			attr_dev(table, "class", "svelte-d5sl0s");
    			add_location(table, file$1, 180, 16, 4423);
    			attr_dev(div3, "class", "resume-table svelte-d5sl0s");
    			add_location(div3, file$1, 179, 12, 4380);
    			attr_dev(section, "class", "content");
    			add_location(section, file$1, 178, 8, 4342);
    			attr_dev(main, "class", "main-content svelte-d5sl0s");
    			add_location(main, file$1, 167, 4, 3872);
    			attr_dev(div4, "class", "dashboard-container svelte-d5sl0s");
    			add_location(div4, file$1, 151, 0, 3257);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, aside);
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
    			append_dev(div4, t11);
    			append_dev(div4, main);
    			append_dev(main, header);
    			append_dev(header, h1);
    			append_dev(header, t13);
    			append_dev(header, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t15);
    			append_dev(div2, div1);
    			append_dev(div1, h3);
    			append_dev(div1, t17);
    			append_dev(div1, p);
    			append_dev(main, t19);
    			append_dev(main, section);
    			append_dev(section, div3);
    			append_dev(div3, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t21);
    			append_dev(tr0, th1);
    			append_dev(tr0, t23);
    			append_dev(tr0, th2);
    			append_dev(tr0, t25);
    			append_dev(tr0, th3);
    			append_dev(table, t27);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t29);
    			append_dev(tr1, td1);
    			append_dev(tr1, t31);
    			append_dev(tr1, td2);
    			append_dev(tr1, t33);
    			append_dev(tr1, td3);
    			append_dev(td3, button1);
    			append_dev(td3, t35);
    			append_dev(td3, button2);
    			append_dev(tbody, t37);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, t39);
    			append_dev(tr2, td5);
    			append_dev(tr2, t41);
    			append_dev(tr2, td6);
    			append_dev(tr2, t43);
    			append_dev(tr2, td7);
    			append_dev(td7, button3);
    			append_dev(td7, t45);
    			append_dev(td7, button4);
    			append_dev(tbody, t47);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td8);
    			append_dev(tr3, t49);
    			append_dev(tr3, td9);
    			append_dev(tr3, t51);
    			append_dev(tr3, td10);
    			append_dev(tr3, t53);
    			append_dev(tr3, td11);
    			append_dev(td11, button5);
    			append_dev(td11, t55);
    			append_dev(td11, button6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Manage",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/pages/dash/Support.svelte generated by Svelte v3.59.2 */

    const file = "src/pages/dash/Support.svelte";

    function create_fragment$2(ctx) {
    	let div3;
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
    	let section;
    	let div2;
    	let div1;
    	let h3;
    	let t13;
    	let form;
    	let label;
    	let t15;
    	let textarea;
    	let t16;
    	let button;

    	const block = {
    		c: function create() {
    			div3 = element("div");
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
    			section = element("section");
    			div2 = element("div");
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Help & Support";
    			t13 = space();
    			form = element("form");
    			label = element("label");
    			label.textContent = "Need Assistance?";
    			t15 = space();
    			textarea = element("textarea");
    			t16 = space();
    			button = element("button");
    			button.textContent = "Send Request";
    			if (!src_url_equal(img.src, img_src_value = "imgs/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Logo");
    			set_style(img, "height", "25px");
    			set_style(img, "width", "45px");
    			attr_dev(img, "class", "svelte-1jxk5oi");
    			add_location(img, file, 131, 12, 2368);
    			attr_dev(div0, "class", "logo svelte-1jxk5oi");
    			add_location(div0, file, 130, 8, 2337);
    			attr_dev(a0, "href", "/#/dash/manage");
    			attr_dev(a0, "class", "svelte-1jxk5oi");
    			add_location(a0, file, 136, 20, 2531);
    			attr_dev(li0, "class", "svelte-1jxk5oi");
    			add_location(li0, file, 136, 16, 2527);
    			attr_dev(a1, "href", "/#/dash/rank");
    			attr_dev(a1, "class", "svelte-1jxk5oi");
    			add_location(a1, file, 137, 20, 2600);
    			attr_dev(li1, "class", "svelte-1jxk5oi");
    			add_location(li1, file, 137, 16, 2596);
    			attr_dev(a2, "href", "/#/dash/support");
    			attr_dev(a2, "class", "svelte-1jxk5oi");
    			add_location(a2, file, 138, 20, 2665);
    			attr_dev(li2, "class", "svelte-1jxk5oi");
    			add_location(li2, file, 138, 16, 2661);
    			attr_dev(a3, "href", "/#/dash/change");
    			attr_dev(a3, "class", "svelte-1jxk5oi");
    			add_location(a3, file, 139, 20, 2728);
    			attr_dev(li3, "class", "svelte-1jxk5oi");
    			add_location(li3, file, 139, 16, 2724);
    			attr_dev(a4, "href", "/#/auth/logout");
    			attr_dev(a4, "class", "svelte-1jxk5oi");
    			add_location(a4, file, 140, 20, 2791);
    			attr_dev(li4, "class", "svelte-1jxk5oi");
    			add_location(li4, file, 140, 16, 2787);
    			attr_dev(ul, "class", "svelte-1jxk5oi");
    			add_location(ul, file, 135, 12, 2506);
    			add_location(nav, file, 134, 8, 2488);
    			attr_dev(aside, "class", "sidebar svelte-1jxk5oi");
    			add_location(aside, file, 129, 4, 2305);
    			attr_dev(h3, "class", "svelte-1jxk5oi");
    			add_location(h3, file, 148, 20, 3060);
    			attr_dev(label, "for", "support-request");
    			attr_dev(label, "class", "svelte-1jxk5oi");
    			add_location(label, file, 150, 24, 3135);
    			attr_dev(textarea, "id", "support-request");
    			attr_dev(textarea, "name", "support-request");
    			attr_dev(textarea, "rows", "4");
    			attr_dev(textarea, "placeholder", "Describe your issue or request...");
    			attr_dev(textarea, "class", "svelte-1jxk5oi");
    			add_location(textarea, file, 151, 24, 3213);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-1jxk5oi");
    			add_location(button, file, 152, 24, 3360);
    			attr_dev(form, "class", "svelte-1jxk5oi");
    			add_location(form, file, 149, 20, 3104);
    			attr_dev(div1, "class", "settings-section svelte-1jxk5oi");
    			add_location(div1, file, 147, 16, 3009);
    			attr_dev(div2, "class", "settings-content svelte-1jxk5oi");
    			add_location(div2, file, 146, 12, 2962);
    			attr_dev(section, "class", "settings-page svelte-1jxk5oi");
    			add_location(section, file, 145, 8, 2918);
    			attr_dev(main, "class", "main-content svelte-1jxk5oi");
    			add_location(main, file, 144, 4, 2882);
    			attr_dev(div3, "class", "dashboard-container svelte-1jxk5oi");
    			add_location(div3, file, 128, 0, 2267);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, aside);
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
    			append_dev(div3, t11);
    			append_dev(div3, main);
    			append_dev(main, section);
    			append_dev(section, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h3);
    			append_dev(div1, t13);
    			append_dev(div1, form);
    			append_dev(form, label);
    			append_dev(form, t15);
    			append_dev(form, textarea);
    			append_dev(form, t16);
    			append_dev(form, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
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

    /* src/pages/dash/Analyse.svelte generated by Svelte v3.59.2 */

    function create_fragment$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("anal");
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
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

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Analyse', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Analyse> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Analyse extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Analyse",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/Router.svelte generated by Svelte v3.59.2 */

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
    		'/auth/login': Login,
    		'/auth/reset': Reset,
    		'/auth/signup': Signup,
    		'/auth/forgot': Forgot,
    		'/auth/logout': Logout,
    		'/dash/rank': Rank,
    		'/dash/change': Change,
    		'/dash/manage': Manage,
    		'/dash/support': Support,
    		'/dash/analyse': Analyse
    	};

    	if ($location == '/') replace("/auth/login");
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		location,
    		replace,
    		Login,
    		Reset,
    		Signup,
    		Forgot,
    		Logout,
    		Rank,
    		Change,
    		Manage,
    		Support,
    		Analyse,
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
