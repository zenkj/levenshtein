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
            case 'equal':
                html.push(equal_html(action[1]));
                break;
            case 'delete':
                html.push(delete_html(action[1]));
                break;
            case 'insert':
                html.push(insert_html(action[1]));
                break;
            case 'replace':
                html.push(delete_html(action[1]));
                html.push(insert_html(action[2]));
                break;
        }
    }

    return html.join('');
}

function levenshtein_combinediff(s1, s2) {
    var actions = levenshtein_diff(s1, s2);
    var combined = [];
    var currstate = '';
    var currvalue = '';
    for (var i=0; i<actions.length; i++) {
        var action = actions[i];
        if (action[0] == currstate) {
            currvalue += action[1];
        } else {
            if (currvalue.length > 0) {
                combined.push([currstate, currvalue]);
            }
            currstate = action[0];
            currvalue = action[1];
        }
    }

    combined.push([currstate, currvalue]);

    return combined;
}


function levenshtein_diff(s1, s2) {
    var len1 = s1.length;
    var len2 = s2.length;
    if (len1 == 0 && len2 == 0) return [];
    if (len1 == 0) return [['insert',s2]];
    if (len2 == 0) return [['delete',s1]];

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
                actions.push(['equal', s1[x1]]);
            } else {
                actions.push(['replace', s1[x1], s2[y1]]);
            }
        } else if (x2 > x1) {
            actions.push(['delete', s1[x1]]);
        } else if (y2 > y1) {
            actions.push(['insert', s2[y1]]);
        }
    }

    return actions;
}

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
