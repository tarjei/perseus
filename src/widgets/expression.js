/** @jsx React.DOM */
(function(Perseus) {

var parse = Perseus.ExpressionTools.parse;
var compare = Perseus.ExpressionTools.compare;

var Expression = React.createClass({
    getInitialState: function() {
        return {value: ""};
    },

    errorTimeout: null,
    lastParsedTex: "",

    render: function() {
        var MJ = Perseus.MJ;  // MathJax
        var result = parse(this.state.value);

        if (result.parsed) {
            this.lastParsedTex = result.expr.tex();

            // We set a timeout of zero so that this runs after rendering -- at
            // this point, the error div isn't necessarily in the DOM yet
            this.errorTimeout = setTimeout(this.hideError, 0);
        } else {
            this.errorTimeout = setTimeout(this.showError, 2000);
        }

        return <span className="perseus-widget-expression">
            <input ref="input" type="text"
                onKeyDown={this.handleKeyDown}
                onKeyPress={this.handleKeyPress} />
            <span className="output">
                <span className="mathjax"
                        style={{opacity: result.parsed ? 1.0 : 0.5}}>
                    <MJ>{this.lastParsedTex}</MJ>
                </span>
                <span className="placeholder">
                    <span ref="error" className="error"
                            style={{display: "none"}}>
                        <span className="buddy" />
                        <span className="message"><span>
                            Sorry, I don't understand that!
                        </span></span>
                    </span>
                </span>
            </span>
        </span>;
    },

    componentWillUnmount: function() {
        clearTimeout(this.errorTimeout);
    },

    showError: React.autoBind(function() {
        var $error = $(this.refs.error.getDOMNode());
        if (!$error.is(":visible")) {
            $error.css({ top: 50, opacity: 0.1 }).show()
                .animate({ top: 0, opacity: 1.0 }, 300);
        }
    }),

    hideError: React.autoBind(function() {
        var $error = $(this.refs.error.getDOMNode());
        if ($error.is(":visible")) {
            $error.animate({ top: 50, opacity: 0.1 }, 300, function() {
                $(this).hide();
            });
        }
    }),

    /**
     * The keydown handler handles clearing the error timeout, updating
     * state.value, and intercepting the backspace key when appropriate...
     */
    handleKeyDown: React.autoBind(function(event) {
        clearTimeout(this.errorTimeout);

        var input = this.refs.input.getDOMNode();
        var text = input.value;

        var start = input.selectionStart;
        var end = input.selectionEnd;
        var supported = start !== undefined;

        var which = event.nativeEvent.keyCode;

        if (supported && which === 8 /* backspace */) {
            if (start === end && text.slice(start - 1, start + 1) === "()") {
                event.preventDefault();
                input.value = text.slice(0, start - 1) + text.slice(start + 1);
                input.selectionStart = start - 1;
                input.selectionEnd = end - 1;
            }
        }

        setTimeout(function() {
            this.setState({value: input.value});
        }.bind(this), 0);
    }),

    /**
     * ...whereas the keypress handler handles the parentheses because keyCode
     * is more useful for actual character insertions (keypress gives 40 for an
     * open paren '(' instead of keydown which gives 57, the code for '9').
     */
    handleKeyPress: React.autoBind(function(event) {
        var input = this.refs.input.getDOMNode();
        var text = input.value;

        var start = input.selectionStart;
        var end = input.selectionEnd;
        var supported = start !== undefined;

        var which = event.nativeEvent.keyCode;

        if (supported && which === 40 /* left paren */) {
            event.preventDefault();

            if (start === end) {
                var insertMatched = _.any([" ", ")", ""], function(val) {
                    return text.charAt(start) === val;
                });

                input.value = text.slice(0, start) +
                        (insertMatched ? "()" : "(") + text.slice(end);
            } else {
                input.value = text.slice(0, start) +
                        "(" + text.slice(start, end) + ")" + text.slice(end);
            }

            input.selectionStart = start + 1;
            input.selectionEnd = end + 1;

        } else if (supported && which === 41 /* right paren */) {
            if (start === end && text.charAt(start) === ")") {
                event.preventDefault();
                input.selectionStart = start + 1;
                input.selectionEnd = end + 1;
            }
        }
    }),

    focus: function() {
        this.refs.input.getDOMNode().focus();
        return true;
    },

    toJSON: function(skipValidation) {
        return this.state;
    },

    setValue: function(value) {
        var input = this.refs.input.getDOMNode();
        input.value = value;
        this.setState({value: value});
    },

    simpleValidate: function(rubric) {
        return Expression.validate(this.toJSON(), rubric);
    }
});

_.extend(Expression, {
    validate: function(state, rubric) {
        var answer = parse(state.value);
        var expected = parse(rubric.value);

        if (!state.value || !answer.parsed) {
            return {
                type: "invalid",
                message: null
            };
        }

        var result = compare(answer.expr, expected.expr, rubric);

        return {
            type: "points",
            earned: result.equal ? 1 : 0,
            total: 1,
            message: result.message
        };
    }
});

var ExpressionEditor = React.createClass({
    defaultState: {
        eval: true,
        form: false,
        simplify: false
    },

    mixins: [Perseus.Util.PropsToState],

    optionLabels: {
        eval: "Answer expression must evaluate the same.",
        form: "Answer expression must have the same form.",
        simplify: "Answer expression must be fully expanded and simplified."
    },

    render: function() {
        return <div>
            <label>
                Correct answer:
                {Expression(_.extend({
                    ref: "expression",
                    onChange: this.props.onChange
                }, this.state))}
            </label>

            {_.map(this.optionLabels, function(labelText, option) {
                return <label>
                    <input type="checkbox" name={option}
                        checked={this.state[option]}
                        onChange={this.handleCheck} />
                    {labelText}
                </label>;
            }, this)}
        </div>;
    },

    componentDidMount: function() {
        this.refs.expression.setValue(this.props.value || "");
    },

    handleCheck: React.autoBind(function(e) {
        var state = {};
        state[e.target.name] = e.target.checked;
        this.setState(state);
    }),

    focus: function() {
        this.refs.expression.focus();
        return true;
    },

    toJSON: function(skipValidation) {
        var value = this.refs.expression.toJSON(skipValidation).value;

        if (!skipValidation) {
            if (value === "") {
                alert("Warning: No expression has been entered.");
            } else if (!parse(value).parsed) {
                alert("Warning: Entered expression didn't parse.");
            }

            if (!this.state.eval && !this.state.form) {
                alert("Warning: Neither semantic nor syntactic checking " +
                        "is enabled.");
            }
        }

        var options = _.pick(this.state, [
            "eval", "form", "simplify"
        ]);
        options.value = value;
        return options;
    }
});

Perseus.Widgets.register("expression", Expression);
Perseus.Widgets.register("expression-editor", ExpressionEditor);

})(Perseus);