(async () => {

    await DB.init();

    const competencia =
        Competencia.getCompetencia();

    document.getElementById(
        "competenciaAtual"
    ).innerText =
        Competencia.formatarCompetencia(
            competencia
        );

    document.getElementById(
        "liquidoPrevisto"
    ).innerText =
        "Sistema Inicializado";

    console.log(
        "SalárioPro iniciado"
    );

})();