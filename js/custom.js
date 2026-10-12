
(function () {
    'use strict';

    // 1. Calculator settings
    var operators = ['+', '−', '×', '÷'];
    var maxDigits = 12;

    // 2. Get HTML elements
    var expr = document.getElementById('expr');
    var result = document.getElementById('result');
    var mini = document.getElementById('mini');
    var keys = document.getElementById('keys');
    var display = document.getElementById('display');
    var panel = document.getElementById('panel');
    var histBtn = document.getElementById('histBtn');
    var histList = document.getElementById('histList');
    var clearHist = document.getElementById('clearHist');

    // 3. Calculator data
    var tokens = [];
    var lastExpr = '';
    var justEvaluated = false;
    var error = false;
    var history = [];  

    // 4. Load saved history
    try {
        history = JSON.parse(localStorage.getItem('calc-history') || '[]');

        if (!Array.isArray(history)) {
            history = [];
        }
    
        history = history.slice(0, 50);
     } catch (e) {
        history = [];
     }

     // Save history
     function saveHistory() {
        try {
            localStorage.setItem('calc-history', JSON.stringify(history));
        } catch (e) {
            // Continue if saving is unavailable
        }
     }

     // 5. Helper functions

     // Check whether a value is an operator
     function isOperator(value) {
        return operators.includes(value);
     }

     // Get the last entered value
     function getLast() {
        return tokens[tokens.length - 1];
     }

     // Add commas to large numbers
     function formatNumber(value) {
        if (value === 'Error') {
            return value;
        }

        if (/e/i.test(value)) {
            return value.replace('e+', 'e');
        }

        var negative = value.startsWith('-');
        var number = value;

        if (negative) {
            number = value.slice(1);
        }

        var parts = number.split('.');
        var whole = parts[0];

        whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        if (parts.length > 1) {
            whole = whole + '.' + parts[1];
        }

        if (negative) {
            whole = '-' + whole;
        }

        return whole;
    }

    // Convert the answer into a clean number
    function cleanNumber(number) {
        if (!Number.isFinite(number)) {
            throw new Error('Invalid number');
        }

        if (Object.is(number, -0)) {
            number = 0;
        }

        var answer = Number(number.toPrecision(12)).toString();

        if (answer.includes('e')) {
            answer = number.toExponential(6);
            answer = answer.replace(/\.?0+e/, 'e');
        }

        return answer;
     }

     // Join numbers and operators into an expression
     function makeExpression(values) {
        return values.join(' ');
     }

             // 6. Calculate the expression
         function calculate(values) {
         var items = values.slice();

         // Remove an operator at the end
         if (items.length > 0) {
             if (isOperator(items[items.length - 1])) {
                items.pop();
            }
         }

         if (items.length === 0) {
            return 0;
         }

         // First calculate multiplication and division
          var temporary = [parseFloat(items[0])];
 
         for (var i = 1; i < items.length; i += 2) {
            var operator = items[i];
            var number = parseFloat(items[i + 1]);

            if (operator === '×') {
                var previous = temporary.pop();
                temporary.push(previous * number);

            } else if (operator === '÷') {
                if (number === 0) {
                    throw new Error('Cannot divide by zero');
                }

                var previous = temporary.pop();
                temporary.push(previous / number);

              } else {
                temporary.push(operator);
                temporary.push(number);
             }
         }

         // Then calculate addition and subtraction
         var answer = temporary[0];

         for (var j = 1; j < temporary.length; j += 2) {
            if (temporary[j] === '+') {
                answer = answer + temporary[j + 1];
            } else {
                answer = answer - temporary[j + 1];
            }
        }

        return answer;
    }

    // 7. Start a new calculation after equals
    function resetIfFinished() {
        if (justEvaluated || error) {
            tokens = [];
            lastExpr = '';
            justEvaluated = false;
            error = false;
        }
    }

    // 8. Enter a digit
    function inputDigit(digit) {
        resetIfFinished();

        var current = getLast();

        if (current !== undefined && !isOperator(current)) {
            var digitCount = current.replace(/[-.]/g, '').length;

            if (digitCount >= maxDigits) {
                return;
            }

            if (current === '0') {
                tokens[tokens.length - 1] = digit;

            } else if (current === '-0') {
                tokens[tokens.length - 1] = '-' + digit;

            } else {
                tokens[tokens.length - 1] = current + digit;
               }

        } else {
            tokens.push(digit);
        }
     } 
     // 9. Enter a decimal point
     function inputDot() {
        resetIfFinished();

         var current = getLast();

         if (current !== undefined && !isOperator(current)) {
            if (current.includes('.')) {
                return;
            }

            tokens[tokens.length - 1] = current + '.';

         } else {
            tokens.push('0.');
         }
     }

     // 10. Enter an operator
     function inputOperator(operator){
         if (error) {
            return;
         }

         if (tokens.length === 0) {
            tokens = ['0'];
         }

         justEvaluated = false;
         lastExpr = '';

         if (isOperator(getLast())) {
            tokens[tokens.length - 1] = operator;
         } else {
            tokens.push(operator);
         }
    }

    // 11. Change the sign
    function toggleSign() {
        if (error) {
            return;
        }

        if (tokens.length === 0) {
            tokens = ['-0'];
            return;
        }

        var current = getLast();

        if (isOperator(current)) {
            tokens.push('-0');
            return;
        }

        if (current.startsWith('-')) {
            tokens[tokens.length - 1] = current.slice(1);
        } else {
            tokens[tokens.length - 1] = '-' + current;
        }

        if (justEvaluated) {
            lastExpr = '';
        }
    }

    // 12. Percentage
    function percent() {
        if (error || tokens.length === 0) {
            return;
        }

        var current = getLast();

        if (isOperator(current)) {
            return;
        }

        try {
            var number = parseFloat(current) / 100;
            tokens[tokens.length - 1] = cleanNumber(number);
        } catch (e) {
            error = true;
        }
    }

    // 13. Backspace
    function backspace() {
        if (error || justEvaluated) {
            clearAll();
            return;
        }

        var current = getLast();

        if (current === undefined) {
            return;
        }

        if (isOperator(current)) {
            tokens.pop();
            return;
        }

        var updated = current.slice(0, -1);

        if (updated === '' || updated === '-') {
            tokens.pop();
        } else {
            tokens[tokens.length - 1] = updated;
        }
     }

     // 14. Clear calculator
     function clearAll() {
        tokens = [];
        lastExpr = '';
        justEvaluated = false;
        error = false;
     }

     // 15. Equals button
     function equals() {
        if (error || justEvaluated) {
            return;
        }
        var numberCount = 0;
        for (var i = 0; i < tokens.length; i++) {
            if (!isOperator(tokens[i])) {
                numberCount++;
            }
        }

        if (numberCount < 2) {
            return;
        }

        var expressionTokens = tokens.slice();

        if (isOperator(expressionTokens[expressionTokens.length - 1])) {
            expressionTokens.pop();
        }

        var expression = makeExpression(expressionTokens);

        try {
            var answer = cleanNumber(calculate(tokens));

            history.unshift({
                expr: expression,
                res: answer
            });

            history = history.slice(0, 50);

            saveHistory();

            tokens = [answer];
            lastExpr = expression;
            justEvaluated = true;

        } catch (e) {
            error = true;
            tokens = [];
            lastExpr = expression;
        }
    }

    // 16. Resize the answer to fit the display
    function fitResult() {
        result.style.transform = 'none';

        var available = result.parentElement.clientWidth;
        var required = result.scrollWidth;

        if (required > available && required > 0) {
            result.style.transform =
                'scale(' + (available / required).toFixed(4) + ')';
        }
     }
 
     // 17. Update the calculator screen
     function render() {
        var big = '0';
        var small = '';

        if (error) {
            big = 'Error';
            small = lastExpr;

        } else if (tokens.length <= 1) {
            big = formatNumber(tokens[0] || '0');

            if (justEvaluated) {
                small = lastExpr;
            }

        } else {
            small = makeExpression(tokens);

            // Show the running answer before equals is pressed
            try {
                big = formatNumber(cleanNumber(calculate(tokens)));
            } catch (e) {
                big = 'Error';
            }
        }

        result.textContent = big;
        expr.textContent = small;

        fitResult();

        // Highlight the selected operator
        var pending = null;

        if (!error && isOperator(getLast())) {
            pending = getLast();
        }

        var buttons = keys.querySelectorAll('[data-action="op"]');

        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].dataset.value === pending) {
                buttons[i].classList.add('active');
            } else {
                buttons[i].classList.remove('active');
            }
        }

        // Display the last two calculations
        mini.innerHTML = '';

        var recent = history.slice(0, 2).reverse();

        for (var j = 0; j < recent.length; j++) {
            var item = recent[j];

            var expression = document.createElement('div');
            expression.className = 'm-expr';
            expression.textContent = item.expr;

            var answer = document.createElement('div');
            answer.className = 'm-res';
            answer.textContent = formatNumber(item.res);

            mini.append(expression, answer);
         }

         if (mini.lastChild) {
            mini.lastChild.style.marginBottom = '0';
         }
     }

     // 18. Display full history
     function renderHistory() {
        histList.innerHTML = '';

        if (history.length === 0) {
            var empty = document.createElement('li');
            empty.className = 'empty';
            empty.textContent = 'No history yet';
                                         
            histList.appendChild(empty);
            return;
         }

         for (var i = 0; i < history.length; i++) {
             var calculation = history[i];

             var item = document.createElement('li');
             var expression = document.createElement('div');
             expression.className = 'h-expr';
             expression.textContent = calculation.expr;
             var answer = document.createElement('div');
             answer.className = 'h-res';
              answer.textContent = formatNumber(calculation.res);
             item.append(expression, answer);
 
             // Load a previous calculation when clicked
             item.addEventListener('click', function (selected) {
                 return function () {
                    tokens = [selected.res];
                    lastExpr = selected.expr;
                    justEvaluated = true;
                    error = false;

                    toggleHistory(false);
                    render();
                };
             }(calculation));
             
             histList.appendChild(item);
        }
     }

     // 19. Open or close history
     function toggleHistory(force) {
        var open;

        if (typeof force === 'boolean') {
            open = force;
        } else {
            open = panel.hidden;
        }
        if (open) {
            renderHistory();
        }
        panel.hidden = !open;
        histBtn.setAttribute('aria-expanded', String(open));
     }

         //  20. Calculator button clicks
         keys.addEventListener('click', function (event) {
         var button = event.target.closest('.key');

         if (!button) {
            return;
         }

         var action = button.dataset.action;
         var value = button.dataset.value;

         if (action === 'digit') {
            inputDigit(value);
         } else if (action === 'dot') {
            inputDot();
         } else if (action === 'op') {
            inputOperator(value);
         } else if (action === 'equals') {
            equals();
         } else if (action === 'clear') {
            clearAll();
         } else if (action === 'sign') {
            toggleSign();
         } else if (action === 'percent') {
            percent();
         }

        render();
     });

     // Click the display to delete the last character
     display.addEventListener('click', function () {
        backspace();
        render();
     });
    
     // History button
     histBtn.addEventListener('click', function () {
        toggleHistory();
     });

     // Clear history
     clearHist.addEventListener('click', function () {
        history = [];
        saveHistory();
        renderHistory();
        render();
     });
    
     // 21. Keyboard controls
     document.addEventListener('keydown', function (event) {
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        var key = event.key;

        if (/^[0-9]$/.test(key)) {
            inputDigit(key);
        } else if (key === '.' || key === ',') {
            inputDot();
        } else if (key === '+') {
            inputOperator('+');
        } else if (key === '-') {
            inputOperator('−');
        } else if (key === '*' || key === 'x' || key === 'X') {
            inputOperator('×');
        } else if (key === '/') {
            event.preventDefault();
            inputOperator('÷');
        } else if (key === '%') {
            percent();
        } else if (key === 'Enter' || key === '=') {
             event.preventDefault();
             if (document.activeElement.classList.contains('key')) {
                document.activeElement.blur();
             }

             equals();
        } else if (key === 'Backspace') {
            backspace(); 
        } else if (
            key === 'Escape' ||
            key === 'Delete' ||
            key === 'c' ||
            key === 'C'
        ) {
            if (!panel.hidden) {
                toggleHistory(false);
            } else {
                clearAll();
            }
        } else {
            return;
        }
        render();
     });

     // 22. Handle window resizing
     window.addEventListener('resize', fitResult);                                               
     if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(fitResult);
     }
    //  start the calculator
     render();
     })();
     