var DIFF_DELETE = -1;
var DIFF_EQUAL = 0;
var DIFF_INSERT = 1;
var DIFF_REPLACE = 2;

var DIFF_NODIFF = 0;
var DIFF_CONFLICT = 1;

// s1: old string
// s2: new string
function levenshtein_htmldiff(s1, s2) {
    function html_escape(str) {
        return str.split('').map(function(ch) {
            switch(ch) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\n': return '<br />';
                default: return ch;
            }
        }).join('');
    }

    function equal_html(str) {
        if (str.length == 0)
            return '';
        return '<span>'+html_escape(str)+'</span>';
    }

    function delete_html(str) {
        if (str.length == 0)
            return '';
        return '<del>'+html_escape(str)+'</del>';
    }

    function insert_html(str) {
        if (str.length == 0)
            return '';
        return '<ins>'+html_escape(str)+'</ins>';
    }

    var actions = levenshtein_combinediff(s1, s2);

    var html = [];
    for (var i=0; i<actions.length; i++) {
        var action = actions[i];
        switch(action[0]) {
            case DIFF_EQUAL:
                html.push(equal_html(action[1]));
                break;
            case DIFF_DELETE:
                html.push(delete_html(action[1]));
                break;
            case DIFF_INSERT:
                html.push(insert_html(action[1]));
                break;
            case DIFF_REPLACE:
                html.push(delete_html(action[1]));
                html.push(insert_html(action[2]));
                break;
        }
    }

    return html.join('');
}

// s1: old string
// s2: new string
function levenshtein_combinediff(s1, s2) {
    var actions = levenshtein_diff(s1, s2);
    return combine_action(actions);
}

function combine_action(actions, begin, end) {
    function combine(action1, action2) {
        for (var i=1; i<action1.length; i++)
            action1[i] += action2[i];
    }

    begin = typeof begin === 'undefined' ? 0 : begin;
    end = typeof end === 'undefined' ? actions.length : end;

    var combined = [];
    var i, curr;

    for (i=begin+1, curr=actions[begin]; i<end; i++) {
        var action = actions[i];
        if (action[0] == curr[0]) {
            combine(curr, action);
        } else {
            if (curr[1].length > 0) {
                combined.push(curr);
            }
            curr = action;
        }
    }

    combined.push(curr);

    return combined;
}

// s1: old string
// s2: new string
function levenshtein_diff(s1, s2) {
    var len1 = s1.length;
    var len2 = s2.length;
    if (len1 == 0 && len2 == 0) return [];
    if (len1 == 0) return s2.split('').map(function(ch){return [DIFF_INSERT,ch];});
    if (len2 == 0) return s1.split('').map(function(ch){return [DIFF_DELETE,ch];});

    var distance_matrix = [];
    var diff_matrix = [];
    for (var i=0; i<=len1; i++) {
        var v = distance_matrix[i] = [];
        var dv = diff_matrix[i] = [];
        for (var j=0; j<=len2; j++) {
            v[j] = i+j;
            dv[j] = 0;
        }
    }

    for (var i=0; i<len1; i++) {
        for (var j=0; j<len2; j++) {
            var diff = s1[i] == s2[j] ? 0 : 1;
            diff_matrix[i+1][j+1] = diff;
            distance_matrix[i+1][j+1] = Math.min(
                distance_matrix[i][j]+diff,
                distance_matrix[i][j+1]+1,
                distance_matrix[i+1][j]+1);
        }
    }

    var path = [[len1, len2, distance_matrix[len1][len2]]];
    var p1 = len1;
    var p2 = len2;
    while (p1 > 0 && p2 > 0) {
        var d = distance_matrix[p1-1][p2]+1;
        var i = distance_matrix[p1][p2-1]+1;
        var r = distance_matrix[p1-1][p2-1]+diff_matrix[p1][p2];
        var v = [[d, p1-1, p2], [i, p1, p2-1], [r, p1-1, p2-1]];
        v.sort(function(a,b) {
            return a[0]-b[0]!=0 ? a[0]-b[0] :
                   a[1]-b[1]!=0 ? a[1]-b[1] :
                   a[2]-b[2];
        });
        p1 = v[0][1];
        p2 = v[0][2];
        path.push([p1, p2, distance_matrix[p1][p2]]);
    }

    while (p1 > 0) {
        p1--;
        path.push([p1, 0, distance_matrix[p1][0]]);
    }
    while (p2 > 0) {
        p2--;
        path.push([0, p2, distance_matrix[0][p2]]);
    }

    path.reverse();

    var actions = [];
    for (var i=0; i<path.length-1; i++) {
        var x1, y1, d1, x2, y2, d2;
        x1 = path[i][0];
        y1 = path[i][1];
        d1 = path[i][2];
        x2 = path[i+1][0];
        y2 = path[i+1][1];
        d2 = path[i+1][2];
        if (x2>x1 && y2>y1) {
            if (d1 == d2) {
                actions.push([DIFF_EQUAL, s1[x1]]);
            } else {
                actions.push([DIFF_REPLACE, s1[x1], s2[y1]]);
            }
        } else if (x2 > x1) {
            actions.push([DIFF_DELETE, s1[x1]]);
        } else if (y2 > y1) {
            actions.push([DIFF_INSERT, s2[y1]]);
        }
    }

    return actions;
}

// s1: old string
// s2: new string
function levenshtein_distance(s1, s2) {
    var len1 = s1.length;
    var len2 = s2.length;
    if (len1 == 0) return len2;
    if (len2 == 0) return len1;

    var v0 = [];
    var v1 = [];
    for (var i=0; i<=len2; i++)
        v0[i] = i;

    for (var i=0; i<len1; i++) {
        v1[0] = i+1;
        for (var j=0; j<len2; j++) {
            var diff = s1[i] == s2[j] ? 0 : 1;
            v1[j+1] = Math.min(v0[j]+diff, v0[j+1]+1, v1[j]+1);
        }
        var tmp = v0;
        v0 = v1;
        v1 = tmp;
    }
    return v0[len2];
}

// 3-way merge of two strings based on levenshtein algorithm
function levenshtein_merge3(origin, s1, s2) {
    function combine_insert(actions) {
        var combined = [];
        var i, curr=null;

        for (i=0; i<actions.length; i++) {
            var action = actions[i];
            if (action[0] == DIFF_INSERT) {
                if (curr == null)
                    curr = action;
                else
                    curr[1] += action[1];
            } else {
                if (curr != null) {
                    combined.push(curr);
                    curr = null;
                }
                combined.push(action);
            }
        }

        if (curr != null) combined.push(curr);
        return combined;
    }

    function add_result(result, action) {
        var a1 = action[0];
        if (a1 == DIFF_EQUAL) {
            result.push([DIFF_NODIFF, action[1]]);
        } else if (a1 == DIFF_INSERT) {
            result.push([DIFF_NODIFF, action[1]]);
        } else if (a1 == DIFF_DELETE) {
            // Do nothing
        } else if (a1 == DIFF_REPLACE) {
            result.push([DIFF_NODIFF, action[2]]);
        } else {
            console.log('error');
        }
    }

    var diffs1 = levenshtein_diff(origin, s1);
    var diffs2 = levenshtein_diff(origin, s2);

    diffs1 = combine_insert(diffs1);
    diffs2 = combine_insert(diffs2);

    var len0 = origin.length;
    var len1 = diffs1.length;
    var len2 = diffs2.length;
    var i0 = 0;
    var i1 = 0;
    var i2 = 0;

    var result_actions = [];
    
    /*
     E: equal
     I: insert
     D: delete
     R: replace

          E2   I2   D2   R2
     E1    2    2    2    2
     I1    1    ?1   1    1
     D1    1    2    1    x
     R1    1    2    x    ?2
     
     ?1: I1==I2: 1; I1!=I2: x
     ?2: R1==R2: 1; R1!=R2: x
    */
    while (i1<len1 && i2<len2) {
        var diff1 = diffs1[i1];
        var diff2 = diffs2[i2];
        var a1 = diff1[0];
        var a2 = diff2[0];
        if (a1 == DIFF_EQUAL) {
            add_result(result_actions, diff2);
            i1++;
            i2++;
        } else if (a1 == DIFF_INSERT) {
            if (a2 != DIFF_INSERT) {
                add_result(result_actions, diff1);
                i1++;
            } else {
                if (diff1[1] == diff2[1]) {
                    add_result(result_actions, diff1);
                } else {
                    result_actions.push([DIFF_CONFLICT, diff1[1], diff2[1]]);
                }
                i1++;
                i2++;
            }
        } else if (a1 == DIFF_DELETE) {
            if (a2 == DIFF_EQUAL || a2 == DIFF_DELETE) {
                add_result(result_actions, diff1);
                i1++;
                i2++;
            } else if (a2 == DIFF_INSERT) {
                add_result(result_actions, diff2);
                i2++;
            } else if (a2 == DIFF_REPLACE) {
                result_actions.push([DIFF_CONFLICT, diff2[1], diff2[2]]);
                i1++;
                i2++;
            }
        } else if (a1 == DIFF_REPLACE) {
            if (a2 == DIFF_EQUAL) {
                add_result(result_actions, diff1);
                i1++;
                i2++;
            } else if (a2 == DIFF_INSERT) {
                add_result(result_actions, diff2);
                i2++;
            } else if (a2 == DIFF_DELETE) {
                result_actions.push([DIFF_CONFLICT, diff1[1], diff1[2]]);
                i1++;
                i2++;
            } else if (a2 == DIFF_REPLACE) {
                if (diff1[2] == diff2[2]) {
                    add_result(result_actions, diff1);
                } else {
                    result_actions.push([DIFF_CONFLICT, diff1[2], diff2[2]]);
                }
                i1++;
                i2++;
            }
        } else {
            console.log('error');
        }
    }

    return combine_action(result_actions);
}
