let data = [
    "+000091013",
    "+000090012 ",
    "+003836015",
    "+00004501A ",
    "+00013501C ",
    "+000090012 ",
    "+000000112 ",
    "+000001012 ",
    "+000002012 ",
    "+000001712 ",
    "+000003018 ",
    "+000008013 ",
    "+00001601C ",
]

for (let dd of data) {
    let con = dd.substring(0, 8);
    let clr = con.replaceAll("+", "");
    let nilai = clr / 10;
    if (nilai < 10) {
        console.log(parseInt(clr));
    } else {
        console.log(nilai);
    }
}