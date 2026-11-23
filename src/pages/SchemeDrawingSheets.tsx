import { useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Download } from 'lucide-react';

interface DrawingSheet {
  number: string;
  title: string;
  scope: string;
  reading: string;
  content: ReactNode;
}

// Drawing revision P1 is a fixed training snapshot. The live model is displayed in the Scheme views.
const sheets: DrawingSheet[] = [
  {
    number: "G‑00",
    title: "Drawing index and reading guide",
    scope: "132 / 33 / 11 kV • training drawing set",
    reading: "A solid line represents a depicted electrical or network path. On PRP drawings, cyan is LAN-A and violet is LAN-B. On the DC sheet, TC is trip coil, CC is close coil and DI is digital input.",
    content: <>
      <div className={"cards"}>
        <div>
          <h3>{"1 · Find the bay"}</h3>
          <p>{"Start at E‑01, choose the voltage sheet, then find the bay in E‑09A or E‑09B."}</p>
        </div>
        <div>
          <h3>{"2 · Read the circuit"}</h3>
          <p>{"Use E‑02 for CT/VT, E‑03 for commands and feedback, and E‑04 for the functional cross-references."}</p>
        </div>
        <div>
          <h3>{"3 · Follow the data"}</h3>
          <p>{"Use SAS‑01 for the network, SAS‑04 for GOOSE and SAS‑02 for the breaker signal trace."}</p>
        </div>
      </div>
    </>,
  },
  {
    number: "E‑01",
    title: "Master single-line diagram",
    scope: "132 / 33 / 11 kV • incoming supply to outgoing feeders",
    reading: "Trace from 132 kV sources down through T1/T2 and DT1/DT2. At each voltage, the coupler links the A and B sections. Use E‑05 to E‑07 for the individual bay branches.",
    content: <>
      <svg viewBox={"0 0 1110 404"} role={"img"} aria-label={"Three-voltage master single-line drawing"}>
        <text x={"23"} y={"74"} className={"strong"}>{"132 kV"}</text>
        <path d={"M104 70H469 M643 70H1084"} className={"bus"} />
        <text x={"106"} y={"61"} className={"small"}>{"BUS A"}</text>
        <text x={"646"} y={"61"} className={"small"}>{"BUS B"}</text>
        <path d={"M469 70h64m46 0h64"} className={"wire"} />
        <path d={"M533 70h10m26 0h10M543 70l22 -12"} className={"wire"} />
        <circle cx={"543"} cy={"70"} r={"4"} className={"terminal"} />
        <circle cx={"569"} cy={"70"} r={"4"} className={"terminal"} />
        <text x={"556"} y={"48"} className={"center small"}>{"CB‑132"}</text>
        <text x={"23"} y={"194"} className={"strong"}>{"33 kV"}</text>
        <path d={"M104 190H469 M643 190H1084"} className={"bus"} />
        <text x={"106"} y={"181"} className={"small"}>{"BUS A"}</text>
        <text x={"646"} y={"181"} className={"small"}>{"BUS B"}</text>
        <path d={"M469 190h64m46 0h64"} className={"wire"} />
        <path d={"M533 190h10m26 0h10M543 190l22 -12"} className={"wire"} />
        <circle cx={"543"} cy={"190"} r={"4"} className={"terminal"} />
        <circle cx={"569"} cy={"190"} r={"4"} className={"terminal"} />
        <text x={"556"} y={"168"} className={"center small"}>{"CB‑33"}</text>
        <text x={"23"} y={"314"} className={"strong"}>{"11 kV"}</text>
        <path d={"M104 310H469 M643 310H1084"} className={"bus"} />
        <text x={"106"} y={"301"} className={"small"}>{"BUS A"}</text>
        <text x={"646"} y={"301"} className={"small"}>{"BUS B"}</text>
        <path d={"M469 310h64m46 0h64"} className={"wire"} />
        <path d={"M533 310h10m26 0h10M543 310l22 -12"} className={"wire"} />
        <circle cx={"543"} cy={"310"} r={"4"} className={"terminal"} />
        <circle cx={"569"} cy={"310"} r={"4"} className={"terminal"} />
        <text x={"556"} y={"288"} className={"center small"}>{"CB‑11"}</text>
        <path d={"M218 70V190"} className={"wire"} />
        <rect x={"136"} y={"101"} width={"164"} height={"49"} rx={"2"} className={"plate"} />
        <text x={"218.0"} y={"122.5"} className={"center strong"}>{"132‑T1"}</text>
        <text x={"218.0"} y={"141.5"} className={"center small"}>{"T1 · 132/33 kV"}</text>
        <path d={"M218 190V310"} className={"wire"} />
        <rect x={"136"} y={"221"} width={"164"} height={"49"} rx={"2"} className={"plate"} />
        <text x={"218.0"} y={"242.5"} className={"center strong"}>{"33‑TF1"}</text>
        <text x={"218.0"} y={"261.5"} className={"center small"}>{"DT1 · 33/11 kV"}</text>
        <path d={"M831 70V190"} className={"wire"} />
        <rect x={"749"} y={"101"} width={"164"} height={"49"} rx={"2"} className={"plate"} />
        <text x={"831.0"} y={"122.5"} className={"center strong"}>{"132‑T2"}</text>
        <text x={"831.0"} y={"141.5"} className={"center small"}>{"T2 · 132/33 kV"}</text>
        <path d={"M831 190V310"} className={"wire"} />
        <rect x={"749"} y={"221"} width={"164"} height={"49"} rx={"2"} className={"plate"} />
        <text x={"831.0"} y={"242.5"} className={"center strong"}>{"33‑TF2"}</text>
        <text x={"831.0"} y={"261.5"} className={"center small"}>{"DT2 · 33/11 kV"}</text>
        <path d={"M145 70V43"} className={"wire"} />
        <text x={"152"} y={"47"} className={"small"}>{"132‑L1"}</text>
        <path d={"M946 70V43"} className={"wire"} />
        <text x={"953"} y={"47"} className={"small"}>{"132‑L2"}</text>
        <path d={"M373 190V217"} className={"wire"} />
        <text x={"380"} y={"221"} className={"strong"}>{"33‑F03"}</text>
        <path d={"M974 190V217"} className={"wire"} />
        <text x={"981"} y={"221"} className={"small"}>{"33 kV feeders"}</text>
        <path d={"M392 310V337"} className={"wire"} />
        <text x={"399"} y={"341"} className={"small"}>{"11 kV feeders"}</text>
        <path d={"M968 310V337"} className={"wire"} />
        <text x={"975"} y={"341"} className={"small"}>{"11 kV feeders"}</text>
        <text x={"23"} y={"377"} className={"small"}>{"Master overview. Feeder banks are grouped. Individual apparatus and bay details belong on the detailed sheets."}</text>
      </svg>
    </>,
  },
  {
    number: "E‑05",
    title: "132 kV bay single-line",
    scope: "Model bus sections, coupler and connected bays",
    reading: "Each vertical branch is one bay. The square represents the bay breaker. OPEN/CLOSED refers to the default simulator snapshot. The transformer references identify the linked bay on the other voltage sheet.",
    content: <>
      <svg viewBox={"0 0 1110 210"} role={"img"} aria-label={"132 kV bus sections and bay branches"}>
        <text x={"25"} y={"38"} className={"strong"}>{"132 kV BUS A"}</text>
        <path d={"M25 64h498"} className={"bus"} />
        <path d={"M72 64v29"} className={"wire"} />
        <rect x={"64"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M72 112v37"} className={"wire"} />
        <text x={"72"} y={"174"} className={"center strong"}>{"132-L1"}</text>
        <text x={"72"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M160 64v29"} className={"wire"} />
        <rect x={"152"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M160 112v37"} className={"wire"} />
        <text x={"160"} y={"174"} className={"center strong"}>{"132-T1"}</text>
        <text x={"160"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <text x={"585"} y={"38"} className={"strong"}>{"132 kV BUS B"}</text>
        <path d={"M585 64h498"} className={"bus"} />
        <path d={"M632 64v29"} className={"wire"} />
        <rect x={"624"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M632 112v37"} className={"wire"} />
        <text x={"632"} y={"174"} className={"center strong"}>{"132-L2"}</text>
        <text x={"632"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M720 64v29"} className={"wire"} />
        <rect x={"712"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M720 112v37"} className={"wire"} />
        <text x={"720"} y={"174"} className={"center strong"}>{"132-T2"}</text>
        <text x={"720"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M523 64h26m21 0h15"} className={"wire"} />
        <rect x={"549"} y={"54"} width={"21"} height={"20"} className={"terminal"} />
        <text x={"553"} y={"101"} className={"center small"}>{"CB-132"}</text>
      </svg>
      <table>
        <thead>
          <tr>
            <th>{"Transformer"}</th>
            <th>{"HV bay"}</th>
            <th>{"LV bay"}</th>
            <th>{"Model rating"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"T1"}</td>
            <td>{"132-T1"}</td>
            <td>{"33-INC1"}</td>
            <td>{"132/33 kV · 50 MVA"}</td>
          </tr>
          <tr>
            <td>{"T2"}</td>
            <td>{"132-T2"}</td>
            <td>{"33-INC2"}</td>
            <td>{"132/33 kV · 50 MVA"}</td>
          </tr>
        </tbody>
      </table>
    </>,
  },
  {
    number: "E‑06",
    title: "33 kV bay single-line",
    scope: "Model bus sections, coupler and connected bays",
    reading: "Each vertical branch is one bay. The square represents the bay breaker. OPEN/CLOSED refers to the default simulator snapshot. The transformer references identify the linked bay on the other voltage sheet.",
    content: <>
      <svg viewBox={"0 0 1110 210"} role={"img"} aria-label={"33 kV bus sections and bay branches"}>
        <text x={"25"} y={"38"} className={"strong"}>{"33 kV BUS A"}</text>
        <path d={"M25 64h498"} className={"bus"} />
        <path d={"M72 64v29"} className={"wire"} />
        <rect x={"64"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M72 112v37"} className={"wire"} />
        <text x={"72"} y={"174"} className={"center strong"}>{"33-INC1"}</text>
        <text x={"72"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M160 64v29"} className={"wire"} />
        <rect x={"152"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M160 112v37"} className={"wire"} />
        <text x={"160"} y={"174"} className={"center strong"}>{"33-F01"}</text>
        <text x={"160"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M248 64v29"} className={"wire"} />
        <rect x={"240"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M248 112v37"} className={"wire"} />
        <text x={"248"} y={"174"} className={"center strong"}>{"33-F02"}</text>
        <text x={"248"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M336 64v29"} className={"wire"} />
        <rect x={"328"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M336 112v37"} className={"wire"} />
        <text x={"336"} y={"174"} className={"center strong"}>{"33-F03"}</text>
        <text x={"336"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M424 64v29"} className={"wire"} />
        <rect x={"416"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M424 112v37"} className={"wire"} />
        <text x={"424"} y={"174"} className={"center strong"}>{"33-TF1"}</text>
        <text x={"424"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <text x={"585"} y={"38"} className={"strong"}>{"33 kV BUS B"}</text>
        <path d={"M585 64h498"} className={"bus"} />
        <path d={"M632 64v29"} className={"wire"} />
        <rect x={"624"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M632 112v37"} className={"wire"} />
        <text x={"632"} y={"174"} className={"center strong"}>{"33-INC2"}</text>
        <text x={"632"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M720 64v29"} className={"wire"} />
        <rect x={"712"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M720 112v37"} className={"wire"} />
        <text x={"720"} y={"174"} className={"center strong"}>{"33-F04"}</text>
        <text x={"720"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M808 64v29"} className={"wire"} />
        <rect x={"800"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M808 112v37"} className={"wire"} />
        <text x={"808"} y={"174"} className={"center strong"}>{"33-F05"}</text>
        <text x={"808"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M896 64v29"} className={"wire"} />
        <rect x={"888"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M896 112v37"} className={"wire"} />
        <text x={"896"} y={"174"} className={"center strong"}>{"33-F06"}</text>
        <text x={"896"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M984 64v29"} className={"wire"} />
        <rect x={"976"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M984 112v37"} className={"wire"} />
        <text x={"984"} y={"174"} className={"center strong"}>{"33-TF2"}</text>
        <text x={"984"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M523 64h26m21 0h15"} className={"wire"} />
        <rect x={"549"} y={"54"} width={"21"} height={"20"} className={"terminal"} />
        <text x={"553"} y={"101"} className={"center small"}>{"CB-33"}</text>
      </svg>
      <table>
        <thead>
          <tr>
            <th>{"Transformer"}</th>
            <th>{"HV bay"}</th>
            <th>{"LV bay"}</th>
            <th>{"Model rating"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"T1"}</td>
            <td>{"132-T1"}</td>
            <td>{"33-INC1"}</td>
            <td>{"132/33 kV · 50 MVA"}</td>
          </tr>
          <tr>
            <td>{"T2"}</td>
            <td>{"132-T2"}</td>
            <td>{"33-INC2"}</td>
            <td>{"132/33 kV · 50 MVA"}</td>
          </tr>
          <tr>
            <td>{"DT1"}</td>
            <td>{"33-TF1"}</td>
            <td>{"11-INC1"}</td>
            <td>{"33/11 kV · 16 MVA"}</td>
          </tr>
          <tr>
            <td>{"DT2"}</td>
            <td>{"33-TF2"}</td>
            <td>{"11-INC2"}</td>
            <td>{"33/11 kV · 16 MVA"}</td>
          </tr>
        </tbody>
      </table>
    </>,
  },
  {
    number: "E‑07",
    title: "11 kV bay single-line",
    scope: "Model bus sections, coupler and connected bays",
    reading: "Each vertical branch is one bay. The square represents the bay breaker. OPEN/CLOSED refers to the default simulator snapshot. The transformer references identify the linked bay on the other voltage sheet.",
    content: <>
      <svg viewBox={"0 0 1110 210"} role={"img"} aria-label={"11 kV bus sections and bay branches"}>
        <text x={"25"} y={"38"} className={"strong"}>{"11 kV BUS A"}</text>
        <path d={"M25 64h498"} className={"bus"} />
        <path d={"M72 64v29"} className={"wire"} />
        <rect x={"64"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M72 112v37"} className={"wire"} />
        <text x={"72"} y={"174"} className={"center strong"}>{"11-INC1"}</text>
        <text x={"72"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M160 64v29"} className={"wire"} />
        <rect x={"152"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M160 112v37"} className={"wire"} />
        <text x={"160"} y={"174"} className={"center strong"}>{"11-F01"}</text>
        <text x={"160"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M248 64v29"} className={"wire"} />
        <rect x={"240"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M248 112v37"} className={"wire"} />
        <text x={"248"} y={"174"} className={"center strong"}>{"11-F02"}</text>
        <text x={"248"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M336 64v29"} className={"wire"} />
        <rect x={"328"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M336 112v37"} className={"wire"} />
        <text x={"336"} y={"174"} className={"center strong"}>{"11-F03"}</text>
        <text x={"336"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M424 64v29"} className={"wire"} />
        <rect x={"416"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M424 112v37"} className={"wire"} />
        <text x={"424"} y={"174"} className={"center strong"}>{"11-F04"}</text>
        <text x={"424"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M512 64v29"} className={"wire"} />
        <rect x={"504"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M512 112v37"} className={"wire"} />
        <text x={"512"} y={"174"} className={"center strong"}>{"11-SP1"}</text>
        <text x={"512"} y={"191"} className={"center small"}>{"OPEN"}</text>
        <text x={"585"} y={"38"} className={"strong"}>{"11 kV BUS B"}</text>
        <path d={"M585 64h498"} className={"bus"} />
        <path d={"M632 64v29"} className={"wire"} />
        <rect x={"624"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M632 112v37"} className={"wire"} />
        <text x={"632"} y={"174"} className={"center strong"}>{"11-INC2"}</text>
        <text x={"632"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M720 64v29"} className={"wire"} />
        <rect x={"712"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M720 112v37"} className={"wire"} />
        <text x={"720"} y={"174"} className={"center strong"}>{"11-F05"}</text>
        <text x={"720"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M808 64v29"} className={"wire"} />
        <rect x={"800"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M808 112v37"} className={"wire"} />
        <text x={"808"} y={"174"} className={"center strong"}>{"11-F06"}</text>
        <text x={"808"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M896 64v29"} className={"wire"} />
        <rect x={"888"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M896 112v37"} className={"wire"} />
        <text x={"896"} y={"174"} className={"center strong"}>{"11-F07"}</text>
        <text x={"896"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M984 64v29"} className={"wire"} />
        <rect x={"976"} y={"93"} width={"16"} height={"19"} className={"terminal"} />
        <path d={"M984 112v37"} className={"wire"} />
        <text x={"984"} y={"174"} className={"center strong"}>{"11-F08"}</text>
        <text x={"984"} y={"191"} className={"center small"}>{"CLOSED"}</text>
        <path d={"M523 64h26m21 0h15"} className={"wire"} />
        <rect x={"549"} y={"54"} width={"21"} height={"20"} className={"terminal"} />
        <text x={"553"} y={"101"} className={"center small"}>{"CB-11"}</text>
      </svg>
      <table>
        <thead>
          <tr>
            <th>{"Transformer"}</th>
            <th>{"HV bay"}</th>
            <th>{"LV bay"}</th>
            <th>{"Model rating"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"DT1"}</td>
            <td>{"33-TF1"}</td>
            <td>{"11-INC1"}</td>
            <td>{"33/11 kV · 16 MVA"}</td>
          </tr>
          <tr>
            <td>{"DT2"}</td>
            <td>{"33-TF2"}</td>
            <td>{"11-INC2"}</td>
            <td>{"33/11 kV · 16 MVA"}</td>
          </tr>
        </tbody>
      </table>
    </>,
  },
  {
    number: "E‑02",
    title: "Feeder AC schematic",
    scope: "33‑F03 • CT / VT functional interfaces",
    reading: "Read left to right from the instrument transformer to the test interface and relay. The CT and VT ratios come from the model. See E‑04 for the functional interface cross-reference.",
    content: <>
      <svg viewBox={"0 0 1110 370"} role={"img"} aria-label={"CT and VT channel-level schematic"}>
        <text x={"23"} y={"30"} className={"strong"}>{"33‑F03  /  CT 400/1 A  /  VT 33000/110 V"}</text>
        <text x={"23"} y={"78"} className={"tier"}>{"CURRENT CHANNELS"}</text>
        <rect x={"192"} y={"89"} width={"190"} height={"89"} className={"plate"} />
        <text x={"287.0"} y={"81"} className={"center small"}>{"Instrument transformer"}</text>
        <rect x={"464"} y={"89"} width={"185"} height={"89"} className={"plate"} />
        <text x={"556.5"} y={"81"} className={"center small"}>{"Test interface"}</text>
        <rect x={"795"} y={"89"} width={"280"} height={"89"} className={"plate"} />
        <text x={"935.0"} y={"81"} className={"center small"}>{"IED‑33‑F03 input group"}</text>
        <text x={"160"} y={"110"} className={"small end"}>{"IA"}</text>
        <path d={"M177 106H229m48 0H501m29 0H795"} className={"wire"} />
        <circle cx={"229"} cy={"106"} r={"4"} className={"terminal"} />
        <circle cx={"277"} cy={"106"} r={"4"} className={"terminal"} />
        <circle cx={"501"} cy={"106"} r={"4"} className={"terminal"} />
        <circle cx={"530"} cy={"106"} r={"4"} className={"terminal"} />
        <circle cx={"795"} cy={"106"} r={"4"} className={"terminal"} />
        <text x={"818"} y={"110"} className={"small"}>{"IA · model channel label"}</text>
        <text x={"160"} y={"135"} className={"small end"}>{"IB"}</text>
        <path d={"M177 131H229m48 0H501m29 0H795"} className={"wire"} />
        <circle cx={"229"} cy={"131"} r={"4"} className={"terminal"} />
        <circle cx={"277"} cy={"131"} r={"4"} className={"terminal"} />
        <circle cx={"501"} cy={"131"} r={"4"} className={"terminal"} />
        <circle cx={"530"} cy={"131"} r={"4"} className={"terminal"} />
        <circle cx={"795"} cy={"131"} r={"4"} className={"terminal"} />
        <text x={"818"} y={"135"} className={"small"}>{"IB · model channel label"}</text>
        <text x={"160"} y={"160"} className={"small end"}>{"IC"}</text>
        <path d={"M177 156H229m48 0H501m29 0H795"} className={"wire"} />
        <circle cx={"229"} cy={"156"} r={"4"} className={"terminal"} />
        <circle cx={"277"} cy={"156"} r={"4"} className={"terminal"} />
        <circle cx={"501"} cy={"156"} r={"4"} className={"terminal"} />
        <circle cx={"530"} cy={"156"} r={"4"} className={"terminal"} />
        <circle cx={"795"} cy={"156"} r={"4"} className={"terminal"} />
        <text x={"818"} y={"160"} className={"small"}>{"IC · model channel label"}</text>
        <text x={"23"} y={"219"} className={"tier"}>{"VOLTAGE CHANNELS"}</text>
        <rect x={"192"} y={"230"} width={"190"} height={"89"} className={"plate"} />
        <text x={"287.0"} y={"222"} className={"center small"}>{"Instrument transformer"}</text>
        <rect x={"464"} y={"230"} width={"185"} height={"89"} className={"plate"} />
        <text x={"556.5"} y={"222"} className={"center small"}>{"Test interface"}</text>
        <rect x={"795"} y={"230"} width={"280"} height={"89"} className={"plate"} />
        <text x={"935.0"} y={"222"} className={"center small"}>{"IED‑33‑F03 input group"}</text>
        <text x={"160"} y={"251"} className={"small end"}>{"VA"}</text>
        <path d={"M177 247H229m48 0H501m29 0H795"} className={"wire"} />
        <circle cx={"229"} cy={"247"} r={"4"} className={"terminal"} />
        <circle cx={"277"} cy={"247"} r={"4"} className={"terminal"} />
        <circle cx={"501"} cy={"247"} r={"4"} className={"terminal"} />
        <circle cx={"530"} cy={"247"} r={"4"} className={"terminal"} />
        <circle cx={"795"} cy={"247"} r={"4"} className={"terminal"} />
        <text x={"818"} y={"251"} className={"small"}>{"VA · model channel label"}</text>
        <text x={"160"} y={"276"} className={"small end"}>{"VB"}</text>
        <path d={"M177 272H229m48 0H501m29 0H795"} className={"wire"} />
        <circle cx={"229"} cy={"272"} r={"4"} className={"terminal"} />
        <circle cx={"277"} cy={"272"} r={"4"} className={"terminal"} />
        <circle cx={"501"} cy={"272"} r={"4"} className={"terminal"} />
        <circle cx={"530"} cy={"272"} r={"4"} className={"terminal"} />
        <circle cx={"795"} cy={"272"} r={"4"} className={"terminal"} />
        <text x={"818"} y={"276"} className={"small"}>{"VB · model channel label"}</text>
        <text x={"160"} y={"301"} className={"small end"}>{"VC"}</text>
        <path d={"M177 297H229m48 0H501m29 0H795"} className={"wire"} />
        <circle cx={"229"} cy={"297"} r={"4"} className={"terminal"} />
        <circle cx={"277"} cy={"297"} r={"4"} className={"terminal"} />
        <circle cx={"501"} cy={"297"} r={"4"} className={"terminal"} />
        <circle cx={"530"} cy={"297"} r={"4"} className={"terminal"} />
        <circle cx={"795"} cy={"297"} r={"4"} className={"terminal"} />
        <text x={"818"} y={"301"} className={"small"}>{"VC · model channel label"}</text>
        <text x={"23"} y={"349"} className={"small"}>{"Channel-level view. Physical terminal IDs, return conductors, grounding and test details are project-dependent."}</text>
      </svg>
    </>,
  },
  {
    number: "E‑03",
    title: "Feeder DC schematic",
    scope: "33‑F03 • trip, close and position feedback",
    reading: "Read one row at a time. Rows 01 and 02 represent command paths. Rows 03 and 04 represent indication paths with the breaker shown open. E‑04 explains each T-number.",
    content: <>
      <svg viewBox={"0 0 1110 418"} role={"img"} aria-label={"Functional DC trip, close and breaker position circuits"}>
        <text x={"142"} y={"36"} className={"small"}>{"DC CONTROL FEED"}</text>
        <text x={"1038"} y={"36"} className={"small center"}>{"RETURN / REFERENCE"}</text>
        <path d={"M165 58v305M1038 58v305"} className={"bus"} />
        <text x={"20"} y={"99"} className={"strong"}>{"01  TRIP"}</text>
        <path d={"M165 94H277 M323 94H524 M556 94H837 M883 94H1038"} className={"wire"} />
        <path d={"M277 94h10m26 0h10M287 94l22 -12"} className={"wire"} />
        <circle cx={"287"} cy={"94"} r={"4"} className={"terminal"} />
        <circle cx={"313"} cy={"94"} r={"4"} className={"terminal"} />
        <text x={"300"} y={"72"} className={"center small"}>{"Trip request"}</text>
        <path d={"M524 94h32"} className={"wire"} />
        <circle cx={"524"} cy={"94"} r={"4"} className={"terminal"} />
        <circle cx={"556"} cy={"94"} r={"4"} className={"terminal"} />
        <text x={"540"} y={"72"} className={"center small"}>{"Trip relay output"}</text>
        <path d={"M837 94h10m26 0h10"} className={"wire"} />
        <circle cx={"860"} cy={"94"} r={"13"} className={"terminal"} />
        <text x={"860"} y={"98"} className={"center small"}>{"TC"}</text>
        <text x={"860"} y={"72"} className={"center small"}>{"TC • trip coil"}</text>
        <text x={"700"} y={"114"} className={"center ref"}>{"E‑04 / T-01"}</text>
        <text x={"20"} y={"179"} className={"strong"}>{"02  CLOSE"}</text>
        <path d={"M165 174H277 M323 174H524 M556 174H837 M883 174H1038"} className={"wire"} />
        <path d={"M277 174h10m26 0h10M287 174l22 -12"} className={"wire"} />
        <circle cx={"287"} cy={"174"} r={"4"} className={"terminal"} />
        <circle cx={"313"} cy={"174"} r={"4"} className={"terminal"} />
        <text x={"300"} y={"152"} className={"center small"}>{"Close permissives"}</text>
        <path d={"M524 174h32"} className={"wire"} />
        <circle cx={"524"} cy={"174"} r={"4"} className={"terminal"} />
        <circle cx={"556"} cy={"174"} r={"4"} className={"terminal"} />
        <text x={"540"} y={"152"} className={"center small"}>{"Close relay output"}</text>
        <path d={"M837 174h10m26 0h10"} className={"wire"} />
        <circle cx={"860"} cy={"174"} r={"13"} className={"terminal"} />
        <text x={"860"} y={"178"} className={"center small"}>{"CC"}</text>
        <text x={"860"} y={"152"} className={"center small"}>{"CC • close coil"}</text>
        <text x={"700"} y={"194"} className={"center ref"}>{"E‑04 / T-02"}</text>
        <text x={"20"} y={"259"} className={"strong"}>{"03  POSITION"}</text>
        <path d={"M165 254H277 M323 254H524 M556 254H837 M883 254H1038"} className={"wire"} />
        <path d={"M277 254h10m26 0h10M287 254l22 -12"} className={"wire"} />
        <circle cx={"287"} cy={"254"} r={"4"} className={"terminal"} />
        <circle cx={"313"} cy={"254"} r={"4"} className={"terminal"} />
        <text x={"300"} y={"232"} className={"center small"}>{"Breaker 52a"}</text>
        <path d={"M524 254h32"} className={"wire"} />
        <circle cx={"524"} cy={"254"} r={"4"} className={"terminal"} />
        <circle cx={"556"} cy={"254"} r={"4"} className={"terminal"} />
        <text x={"540"} y={"232"} className={"center small"}>{"Field → panel interface"}</text>
        <path d={"M837 254h9m28 0h9"} className={"wire"} />
        <rect x={"846"} y={"243"} width={"28"} height={"22"} className={"terminal"} />
        <text x={"860"} y={"258"} className={"center small"}>{"DI"}</text>
        <text x={"860"} y={"232"} className={"center small"}>{"Closed indication"}</text>
        <text x={"700"} y={"274"} className={"center ref"}>{"E‑04 / T-03"}</text>
        <text x={"20"} y={"339"} className={"strong"}>{"04  POSITION"}</text>
        <path d={"M165 334H277 M323 334H524 M556 334H837 M883 334H1038"} className={"wire"} />
        <path d={"M277 334h10m26 0h10M287 334h26"} className={"wire"} />
        <circle cx={"287"} cy={"334"} r={"4"} className={"terminal"} />
        <circle cx={"313"} cy={"334"} r={"4"} className={"terminal"} />
        <text x={"300"} y={"312"} className={"center small"}>{"Breaker 52b"}</text>
        <path d={"M524 334h32"} className={"wire"} />
        <circle cx={"524"} cy={"334"} r={"4"} className={"terminal"} />
        <circle cx={"556"} cy={"334"} r={"4"} className={"terminal"} />
        <text x={"540"} y={"312"} className={"center small"}>{"Field → panel interface"}</text>
        <path d={"M837 334h9m28 0h9"} className={"wire"} />
        <rect x={"846"} y={"323"} width={"28"} height={"22"} className={"terminal"} />
        <text x={"860"} y={"338"} className={"center small"}>{"DI"}</text>
        <text x={"860"} y={"312"} className={"center small"}>{"Open indication"}</text>
        <text x={"700"} y={"354"} className={"center ref"}>{"E‑04 / T-04"}</text>
        <text x={"20"} y={"397"} className={"small"}>{"Breaker shown open. Terminal IDs, DC protection, supervision and final interlocks require approved schematics."}</text>
      </svg>
    </>,
  },
  {
    number: "E‑04",
    title: "Terminal and cable schedule",
    scope: "33‑F03 • functional interfaces",
    reading: "Match the Ref. column to the callout on E‑02 or E‑03. The references identify the illustrated interfaces. Physical terminal and cable schedules are project inputs.",
    content: <>
      <table>
        <thead>
          <tr>
            <th>{"Ref."}</th>
            <th>{"Function"}</th>
            <th>{"Field endpoint"}</th>
            <th>{"Panel endpoint"}</th>
            <th>{"Sheet"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"T‑01"}</td>
            <td>{"Trip"}</td>
            <td>{"Breaker trip interface"}</td>
            <td>{"Trip output interface"}</td>
            <td>{"E‑03 / 01"}</td>
          </tr>
          <tr>
            <td>{"T‑02"}</td>
            <td>{"Close"}</td>
            <td>{"Breaker close interface"}</td>
            <td>{"Close output interface"}</td>
            <td>{"E‑03 / 02"}</td>
          </tr>
          <tr>
            <td>{"T‑03"}</td>
            <td>{"Closed feedback"}</td>
            <td>{"Breaker 52a"}</td>
            <td>{"IED indication input"}</td>
            <td>{"E‑03 / 03"}</td>
          </tr>
          <tr>
            <td>{"T‑04"}</td>
            <td>{"Open feedback"}</td>
            <td>{"Breaker 52b"}</td>
            <td>{"IED indication input"}</td>
            <td>{"E‑03 / 04"}</td>
          </tr>
          <tr>
            <td>{"A‑01"}</td>
            <td>{"CT"}</td>
            <td>{"CT secondary interface"}</td>
            <td>{"IED current input interface"}</td>
            <td>{"E‑02"}</td>
          </tr>
          <tr>
            <td>{"A‑02"}</td>
            <td>{"VT"}</td>
            <td>{"VT secondary interface"}</td>
            <td>{"IED voltage input interface"}</td>
            <td>{"E‑02"}</td>
          </tr>
        </tbody>
      </table>
      <p className={"note"}>{"These are preview cross-references. Physical terminal numbers, cable IDs and core numbers remain unassigned."}</p>
    </>,
  },
  {
    number: "E‑08",
    title: "Protection and breaker control",
    scope: "33‑F03 • protection, supervision and permissive overview",
    reading: "Start with the command source. Trace across to the breaker, then read the separate feedback and supervision paths. E‑03 provides the corresponding feeder functional circuit rows.",
    content: <>
      <svg viewBox={"0 0 1110 352"} role={"img"} aria-label={"Protection, control and supervision functions"}>
        <text x={"25"} y={"29"} className={"strong"}>{"01  PROTECTION TRIP"}</text>
        <rect x={"25.0"} y={"52"} width={"228.0"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"139.0"} y={"76.0"} className={"center strong"}>{"CT / VT"}</text>
        <text x={"139.0"} y={"95.0"} className={"center small"}>{"Measurement inputs"}</text>
        <path d={"M253.0 79h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"290.0"} y={"52"} width={"228.0"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"404.0"} y={"76.0"} className={"center strong"}>{"Protection IED"}</text>
        <text x={"404.0"} y={"95.0"} className={"center small"}>{"Feeder protection decision"}</text>
        <path d={"M518.0 79h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"555.0"} y={"52"} width={"228.0"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"669.0"} y={"76.0"} className={"center strong"}>{"Trip interface"}</text>
        <text x={"669.0"} y={"95.0"} className={"center small"}>{"Breaker trip request"}</text>
        <path d={"M783.0 79h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"820.0"} y={"52"} width={"228.0"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"934.0"} y={"76.0"} className={"center strong"}>{"CB‑33‑F03"}</text>
        <text x={"934.0"} y={"95.0"} className={"center small"}>{"Position feedback"}</text>
        <text x={"25"} y={"140"} className={"strong"}>{"02  CLOSE REQUEST"}</text>
        <rect x={"25.0"} y={"163"} width={"228.0"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"139.0"} y={"187.0"} className={"center strong"}>{"Local / remote"}</text>
        <text x={"139.0"} y={"206.0"} className={"center small"}>{"Command source selection"}</text>
        <path d={"M253.0 190h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"290.0"} y={"163"} width={"228.0"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"404.0"} y={"187.0"} className={"center strong"}>{"Interlock check"}</text>
        <text x={"404.0"} y={"206.0"} className={"center small"}>{"Model close permissive"}</text>
        <path d={"M518.0 190h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"555.0"} y={"163"} width={"228.0"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"669.0"} y={"187.0"} className={"center strong"}>{"Close interface"}</text>
        <text x={"669.0"} y={"206.0"} className={"center small"}>{"Breaker close request"}</text>
        <path d={"M783.0 190h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"820.0"} y={"163"} width={"228.0"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"934.0"} y={"187.0"} className={"center strong"}>{"52a / 52b"}</text>
        <text x={"934.0"} y={"206.0"} className={"center small"}>{"Position confirmation"}</text>
        <text x={"25"} y={"251"} className={"strong"}>{"03  SUPERVISION"}</text>
        <rect x={"25.0"} y={"274"} width={"316.3333333333333"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"183.16666666666666"} y={"298.0"} className={"center strong"}>{"Trip circuit"}</text>
        <text x={"183.16666666666666"} y={"317.0"} className={"center small"}>{"Supervision input"}</text>
        <path d={"M341.3333333333333 301h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"378.3333333333333"} y={"274"} width={"316.3333333333333"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"536.5"} y={"298.0"} className={"center strong"}>{"IED diagnostics"}</text>
        <text x={"536.5"} y={"317.0"} className={"center small"}>{"Model TCS state"}</text>
        <path d={"M694.6666666666666 301h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"731.6666666666666"} y={"274"} width={"316.3333333333333"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"889.8333333333333"} y={"298.0"} className={"center strong"}>{"SCADA / HMI"}</text>
        <text x={"889.8333333333333"} y={"317.0"} className={"center small"}>{"Alarm and event display"}</text>
      </svg>
      <div className={"cards"}>
        <div>
          <h3>{"Close permissive"}</h3>
          <p>{"Review the selected bay’s interlock reason, control mode, earth-switch state and other simulator flags."}</p>
        </div>
        <div>
          <h3>{"Transformer and coupler variants"}</h3>
          <p>{"Follow the master and voltage sheets for transformer pairings. Coupler transfer and intertrip logic depend on the bay type."}</p>
        </div>
      </div>
    </>,
  },
  {
    number: "E‑09A",
    title: "Bay and instrument-transformer register",
    scope: "Default project model • part 1",
    reading: "Find the bay tag first. Use its voltage sheet for the primary connection and the IED tag to locate the corresponding network or signal references.",
    content: <>
      <table>
        <thead>
          <tr>
            <th>{"Bay"}</th>
            <th>{"Bus"}</th>
            <th>{"Function"}</th>
            <th>{"Breaker"}</th>
            <th>{"IED"}</th>
            <th>{"CT / VT ratio"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"132-L1"}</td>
            <td>{"132 kV / A"}</td>
            <td>{"Line Incomer"}</td>
            <td>{"CB-132-L1"}</td>
            <td>{"IED-132-L1"}</td>
            <td>{"800/1 A · 132000/110 V"}</td>
          </tr>
          <tr>
            <td>{"132-L2"}</td>
            <td>{"132 kV / B"}</td>
            <td>{"Line Incomer"}</td>
            <td>{"CB-132-L2"}</td>
            <td>{"IED-132-L2"}</td>
            <td>{"800/1 A · 132000/110 V"}</td>
          </tr>
          <tr>
            <td>{"CB-132"}</td>
            <td>{"132 kV / COUPLE"}</td>
            <td>{"Bus Coupler"}</td>
            <td>{"CB-132"}</td>
            <td>{"IED-132-BC"}</td>
            <td>{"1200/1 A · 132000/110 V"}</td>
          </tr>
          <tr>
            <td>{"132-T1"}</td>
            <td>{"132 kV / A"}</td>
            <td>{"Transformer Hv"}</td>
            <td>{"CB-132-T1"}</td>
            <td>{"IED-132-T1"}</td>
            <td>{"400/1 A · 132000/110 V"}</td>
          </tr>
          <tr>
            <td>{"132-T2"}</td>
            <td>{"132 kV / B"}</td>
            <td>{"Transformer Hv"}</td>
            <td>{"CB-132-T2"}</td>
            <td>{"IED-132-T2"}</td>
            <td>{"400/1 A · 132000/110 V"}</td>
          </tr>
          <tr>
            <td>{"33-INC1"}</td>
            <td>{"33 kV / A"}</td>
            <td>{"Transformer Lv Incomer"}</td>
            <td>{"CB-33-INC1"}</td>
            <td>{"IED-33-INC1"}</td>
            <td>{"1250/1 A · 33000/110 V"}</td>
          </tr>
          <tr>
            <td>{"33-INC2"}</td>
            <td>{"33 kV / B"}</td>
            <td>{"Transformer Lv Incomer"}</td>
            <td>{"CB-33-INC2"}</td>
            <td>{"IED-33-INC2"}</td>
            <td>{"1250/1 A · 33000/110 V"}</td>
          </tr>
          <tr>
            <td>{"CB-33"}</td>
            <td>{"33 kV / COUPLE"}</td>
            <td>{"Bus Coupler"}</td>
            <td>{"CB-33"}</td>
            <td>{"IED-33-BC"}</td>
            <td>{"1250/1 A · 33000/110 V"}</td>
          </tr>
          <tr>
            <td>{"33-F01"}</td>
            <td>{"33 kV / A"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-33-F01"}</td>
            <td>{"IED-33-F01"}</td>
            <td>{"400/1 A · 33000/110 V"}</td>
          </tr>
          <tr>
            <td>{"33-F02"}</td>
            <td>{"33 kV / A"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-33-F02"}</td>
            <td>{"IED-33-F02"}</td>
            <td>{"400/1 A · 33000/110 V"}</td>
          </tr>
          <tr>
            <td>{"33-F03"}</td>
            <td>{"33 kV / A"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-33-F03"}</td>
            <td>{"IED-33-F03"}</td>
            <td>{"400/1 A · 33000/110 V"}</td>
          </tr>
          <tr>
            <td>{"33-TF1"}</td>
            <td>{"33 kV / A"}</td>
            <td>{"Dist Tx Feeder"}</td>
            <td>{"CB-33-TF1"}</td>
            <td>{"IED-33-TF1"}</td>
            <td>{"400/1 A · 33000/110 V"}</td>
          </tr>
          <tr>
            <td>{"33-F04"}</td>
            <td>{"33 kV / B"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-33-F04"}</td>
            <td>{"IED-33-F04"}</td>
            <td>{"400/1 A · 33000/110 V"}</td>
          </tr>
          <tr>
            <td>{"33-F05"}</td>
            <td>{"33 kV / B"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-33-F05"}</td>
            <td>{"IED-33-F05"}</td>
            <td>{"400/1 A · 33000/110 V"}</td>
          </tr>
        </tbody>
      </table>
    </>,
  },
  {
    number: "E‑09B",
    title: "Bay and instrument-transformer register",
    scope: "Default project model • part 2",
    reading: "Find the bay tag first. Use its voltage sheet for the primary connection and the IED tag to locate the corresponding network or signal references.",
    content: <>
      <table>
        <thead>
          <tr>
            <th>{"Bay"}</th>
            <th>{"Bus"}</th>
            <th>{"Function"}</th>
            <th>{"Breaker"}</th>
            <th>{"IED"}</th>
            <th>{"CT / VT ratio"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"33-F06"}</td>
            <td>{"33 kV / B"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-33-F06"}</td>
            <td>{"IED-33-F06"}</td>
            <td>{"400/1 A · 33000/110 V"}</td>
          </tr>
          <tr>
            <td>{"33-TF2"}</td>
            <td>{"33 kV / B"}</td>
            <td>{"Dist Tx Feeder"}</td>
            <td>{"CB-33-TF2"}</td>
            <td>{"IED-33-TF2"}</td>
            <td>{"400/1 A · 33000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-INC1"}</td>
            <td>{"11 kV / A"}</td>
            <td>{"Transformer Lv Incomer"}</td>
            <td>{"CB-11-INC1"}</td>
            <td>{"IED-11-INC1"}</td>
            <td>{"1000/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-INC2"}</td>
            <td>{"11 kV / B"}</td>
            <td>{"Transformer Lv Incomer"}</td>
            <td>{"CB-11-INC2"}</td>
            <td>{"IED-11-INC2"}</td>
            <td>{"1000/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"CB-11"}</td>
            <td>{"11 kV / COUPLE"}</td>
            <td>{"Bus Coupler"}</td>
            <td>{"CB-11"}</td>
            <td>{"IED-11-BC"}</td>
            <td>{"1000/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-F01"}</td>
            <td>{"11 kV / A"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-11-F01"}</td>
            <td>{"IED-11-F01"}</td>
            <td>{"300/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-F02"}</td>
            <td>{"11 kV / A"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-11-F02"}</td>
            <td>{"IED-11-F02"}</td>
            <td>{"300/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-F03"}</td>
            <td>{"11 kV / A"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-11-F03"}</td>
            <td>{"IED-11-F03"}</td>
            <td>{"300/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-F04"}</td>
            <td>{"11 kV / A"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-11-F04"}</td>
            <td>{"IED-11-F04"}</td>
            <td>{"300/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-F05"}</td>
            <td>{"11 kV / B"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-11-F05"}</td>
            <td>{"IED-11-F05"}</td>
            <td>{"300/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-F06"}</td>
            <td>{"11 kV / B"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-11-F06"}</td>
            <td>{"IED-11-F06"}</td>
            <td>{"300/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-F07"}</td>
            <td>{"11 kV / B"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-11-F07"}</td>
            <td>{"IED-11-F07"}</td>
            <td>{"300/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-F08"}</td>
            <td>{"11 kV / B"}</td>
            <td>{"Outgoing Feeder"}</td>
            <td>{"CB-11-F08"}</td>
            <td>{"IED-11-F08"}</td>
            <td>{"300/1 A · 11000/110 V"}</td>
          </tr>
          <tr>
            <td>{"11-SP1"}</td>
            <td>{"11 kV / A"}</td>
            <td>{"Spare Feeder"}</td>
            <td>{"CB-11-SP1"}</td>
            <td>{"IED-11-SP1"}</td>
            <td>{"300/1 A · 11000/110 V"}</td>
          </tr>
        </tbody>
      </table>
    </>,
  },
  {
    number: "SAS‑01",
    title: "PRP station-bus architecture",
    scope: "Station level and example bay connections",
    reading: "Follow the cyan path for LAN-A and violet for LAN-B. A junction dot marks a connection. The model provides LAN-A links for the HMI and gateway in this view. The dashed gateway-to-RCC line represents the logical IEC‑104 interface.",
    content: <>
      <svg viewBox={"0 0 1110 420"} role={"img"} aria-label={"PRP station bus networks A and B"}>
        <text x={"23"} y={"36"} className={"tier"}>{"STATION LEVEL"}</text>
        <text x={"23"} y={"277"} className={"tier"}>{"BAY LEVEL"}</text>
        <rect x={"95"} y={"76"} width={"170"} height={"53"} rx={"2"} className={"plate"} />
        <text x={"180.0"} y={"99.5"} className={"center strong"}>{"SCADA server"}</text>
        <text x={"180.0"} y={"118.5"} className={"center small"}>{"SRV‑SCADA‑A"}</text>
        <rect x={"310"} y={"76"} width={"178"} height={"53"} rx={"2"} className={"plate"} />
        <text x={"399.0"} y={"99.5"} className={"center strong"}>{"Time master"}</text>
        <text x={"399.0"} y={"118.5"} className={"center small"}>{"CLK‑PTP‑GM"}</text>
        <rect x={"555"} y={"76"} width={"180"} height={"53"} rx={"2"} className={"plate"} />
        <text x={"645.0"} y={"99.5"} className={"center strong"}>{"Operator HMI"}</text>
        <text x={"645.0"} y={"118.5"} className={"center small"}>{"WS‑HMI‑01"}</text>
        <rect x={"790"} y={"76"} width={"164"} height={"53"} rx={"2"} className={"plate"} />
        <text x={"872.0"} y={"99.5"} className={"center strong"}>{"Station gateway"}</text>
        <text x={"872.0"} y={"118.5"} className={"center small"}>{"GTW‑RCC‑01"}</text>
        <rect x={"995"} y={"76"} width={"100"} height={"53"} rx={"2"} className={"plate"} />
        <text x={"1045.0"} y={"99.5"} className={"center strong"}>{"RCC"}</text>
        <text x={"1045.0"} y={"118.5"} className={"center small"}>{"IEC‑104"}</text>
        <path d={"M110 176H971"} className={"lan-a"} />
        <rect x={"21"} y={"161"} width={"86"} height={"29"} rx={"2"} className={"lan-a-box"} />
        <text x={"64.0"} y={"180.5"} className={"center strong"}>{"LAN-A"}</text>
        <text x={"970"} y={"166"} className={"small end"}>{"SW‑LAN‑A1"}</text>
        <path d={"M110 229H971"} className={"lan-b"} />
        <rect x={"21"} y={"214"} width={"86"} height={"29"} rx={"2"} className={"lan-b-box"} />
        <text x={"64.0"} y={"233.5"} className={"center strong"}>{"LAN-B"}</text>
        <text x={"970"} y={"219"} className={"small end"}>{"SW‑LAN‑B1"}</text>
        <path d={"M161 129V176"} className={"lan-a"} />
        <circle cx={"161"} cy={"176"} r={"3.7"} className={"lan-a-dot"} />
        <path d={"M199 129V229"} className={"lan-b"} />
        <circle cx={"199"} cy={"229"} r={"3.7"} className={"lan-b-dot"} />
        <path d={"M366 129V176"} className={"lan-a"} />
        <circle cx={"366"} cy={"176"} r={"3.7"} className={"lan-a-dot"} />
        <path d={"M408 129V229"} className={"lan-b"} />
        <circle cx={"408"} cy={"229"} r={"3.7"} className={"lan-b-dot"} />
        <path d={"M640 129V176"} className={"lan-a"} />
        <circle cx={"640"} cy={"176"} r={"3.7"} className={"lan-a-dot"} />
        <path d={"M870 129V176"} className={"lan-a"} />
        <circle cx={"870"} cy={"176"} r={"3.7"} className={"lan-a-dot"} />
        <path d={"M954 103h41"} className={"remote"} />
        <path d={"M242 176V306"} className={"lan-a"} />
        <circle cx={"242"} cy={"176"} r={"3.7"} className={"lan-a-dot"} />
        <path d={"M268 229V306"} className={"lan-b"} />
        <circle cx={"268"} cy={"229"} r={"3.7"} className={"lan-b-dot"} />
        <rect x={"165"} y={"306"} width={"180"} height={"53"} rx={"2"} className={"plate"} />
        <text x={"255.0"} y={"329.5"} className={"center strong"}>{"Feeder protection"}</text>
        <text x={"255.0"} y={"348.5"} className={"center small"}>{"IED‑33‑F03"}</text>
        <path d={"M541 176V306"} className={"lan-a"} />
        <circle cx={"541"} cy={"176"} r={"3.7"} className={"lan-a-dot"} />
        <path d={"M567 229V306"} className={"lan-b"} />
        <circle cx={"567"} cy={"229"} r={"3.7"} className={"lan-b-dot"} />
        <rect x={"464"} y={"306"} width={"180"} height={"53"} rx={"2"} className={"plate"} />
        <text x={"554.0"} y={"329.5"} className={"center strong"}>{"Incomer control"}</text>
        <text x={"554.0"} y={"348.5"} className={"center small"}>{"IED‑33‑INC1"}</text>
        <path d={"M842 176V306"} className={"lan-a"} />
        <circle cx={"842"} cy={"176"} r={"3.7"} className={"lan-a-dot"} />
        <path d={"M868 229V306"} className={"lan-b"} />
        <circle cx={"868"} cy={"229"} r={"3.7"} className={"lan-b-dot"} />
        <rect x={"765"} y={"306"} width={"180"} height={"53"} rx={"2"} className={"plate"} />
        <text x={"855.0"} y={"329.5"} className={"center strong"}>{"Bus coupler control"}</text>
        <text x={"855.0"} y={"348.5"} className={"center small"}>{"IED‑33‑BC"}</text>
        <text x={"24"} y={"400"} className={"small"}>{"PRP planes shown separately. Dots mark connected endpoints. Gateway → RCC is a functional interface."}</text>
      </svg>
    </>,
  },
  {
    number: "SAS‑03",
    title: "Station network port schedule",
    scope: "Model ports for station equipment and selected bays",
    reading: "Match the equipment identifier on SAS‑01 to this table and compare the two plane terminations. Physical cable and patch-panel references remain open.",
    content: <>
      <table>
        <thead>
          <tr>
            <th>{"Equipment"}</th>
            <th>{"Equipment port"}</th>
            <th>{"Switch"}</th>
            <th>{"Switch port"}</th>
            <th>{"Model medium"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"SRV-SCADA-A"}</td>
            <td>{"ETH-PRP-A"}</td>
            <td>{"SW-LAN-A1"}</td>
            <td>{"Gi1/1"}</td>
            <td>{"1000BASE-LX Singlemode LC"}</td>
          </tr>
          <tr>
            <td>{"SRV-SCADA-A"}</td>
            <td>{"ETH-PRP-B"}</td>
            <td>{"SW-LAN-B1"}</td>
            <td>{"Gi1/1"}</td>
            <td>{"1000BASE-LX Singlemode LC"}</td>
          </tr>
          <tr>
            <td>{"CLK-PTP-GM"}</td>
            <td>{"PTP-1"}</td>
            <td>{"SW-LAN-A1"}</td>
            <td>{"Gi1/2"}</td>
            <td>{"1000BASE-LX Singlemode LC"}</td>
          </tr>
          <tr>
            <td>{"CLK-PTP-GM"}</td>
            <td>{"PTP-2"}</td>
            <td>{"SW-LAN-B1"}</td>
            <td>{"Gi1/2"}</td>
            <td>{"1000BASE-LX Singlemode LC"}</td>
          </tr>
          <tr>
            <td>{"WS-HMI-01"}</td>
            <td>{"PRP-PortA"}</td>
            <td>{"SW-LAN-A1"}</td>
            <td>{"Gi1/3"}</td>
            <td>{"1000BASE-T RJ45"}</td>
          </tr>
          <tr>
            <td>{"GTW-RCC-01"}</td>
            <td>{"ETH-A"}</td>
            <td>{"SW-LAN-A1"}</td>
            <td>{"Gi1/4"}</td>
            <td>{"100BASE-FX Multimode LC"}</td>
          </tr>
          <tr>
            <td>{"IED-33-INC1"}</td>
            <td>{"ChA (LC-FX)"}</td>
            <td>{"SW-LAN-A1"}</td>
            <td>{"Fa1/10"}</td>
            <td>{"100BASE-FX Multimode LC"}</td>
          </tr>
          <tr>
            <td>{"IED-33-INC1"}</td>
            <td>{"ChB (LC-FX)"}</td>
            <td>{"SW-LAN-B1"}</td>
            <td>{"Fa1/10"}</td>
            <td>{"100BASE-FX Multimode LC"}</td>
          </tr>
          <tr>
            <td>{"IED-33-BC"}</td>
            <td>{"ChA (LC-FX)"}</td>
            <td>{"SW-LAN-A1"}</td>
            <td>{"Fa1/12"}</td>
            <td>{"100BASE-FX Multimode LC"}</td>
          </tr>
          <tr>
            <td>{"IED-33-BC"}</td>
            <td>{"ChB (LC-FX)"}</td>
            <td>{"SW-LAN-B1"}</td>
            <td>{"Fa1/12"}</td>
            <td>{"100BASE-FX Multimode LC"}</td>
          </tr>
          <tr>
            <td>{"IED-33-F03"}</td>
            <td>{"ChA (LC-FX)"}</td>
            <td>{"SW-LAN-A1"}</td>
            <td>{"Fa1/15"}</td>
            <td>{"100BASE-FX Multimode LC"}</td>
          </tr>
          <tr>
            <td>{"IED-33-F03"}</td>
            <td>{"ChB (LC-FX)"}</td>
            <td>{"SW-LAN-B1"}</td>
            <td>{"Fa1/15"}</td>
            <td>{"100BASE-FX Multimode LC"}</td>
          </tr>
        </tbody>
      </table>
    </>,
  },
  {
    number: "SAS‑04",
    title: "GOOSE publisher and subscribers",
    scope: "33‑F03 example • project GOOSE configuration",
    reading: "Start at the publisher, then look up the expected subscriber list. Use SAS‑01 for the network paths and keep GOOSE bindings distinct from IEC‑104 addresses.",
    content: <>
      <svg viewBox={"0 0 1110 130"} role={"img"} aria-label={"GOOSE publisher-to-subscribers relationship"}>
        <text x={"25"} y={"29"} className={"strong"}>{"01  MESSAGE DISTRIBUTION"}</text>
        <rect x={"25.0"} y={"52"} width={"316.3333333333333"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"183.16666666666666"} y={"76.0"} className={"center strong"}>{"IED‑33‑F03"}</text>
        <text x={"183.16666666666666"} y={"95.0"} className={"center small"}>{"Publisher"}</text>
        <path d={"M341.3333333333333 79h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"378.3333333333333"} y={"52"} width={"316.3333333333333"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"536.5"} y={"76.0"} className={"center strong"}>{"Station bus"}</text>
        <text x={"536.5"} y={"95.0"} className={"center small"}>{"GOOSE multicast"}</text>
        <path d={"M694.6666666666666 79h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"731.6666666666666"} y={"52"} width={"316.3333333333333"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"889.8333333333333"} y={"76.0"} className={"center strong"}>{"Configured IEDs"}</text>
        <text x={"889.8333333333333"} y={"95.0"} className={"center small"}>{"Subscribers listed below"}</text>
      </svg>
      <table>
        <thead>
          <tr>
            <th>{"Control block"}</th>
            <th>{"Publisher"}</th>
            <th>{"Subscribers"}</th>
            <th>{"VLAN"}</th>
            <th>{"APPID"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"gcbFeeder03StatusTrip"}</td>
            <td>{"IED-33-F03"}</td>
            <td>{"IED-33-INC1, IED-33-BC"}</td>
            <td>{"133"}</td>
            <td>{"0x0033"}</td>
          </tr>
        </tbody>
      </table>
    </>,
  },
  {
    number: "SAS‑05",
    title: "Communications and time synchronization",
    scope: "Station protocols • northbound gateway and time distribution",
    reading: "Choose the service based on the job. For example, follow GOOSE for peer messages, and follow the station gateway for the RCC interface. The drawing identifies the time source separately.",
    content: <>
      <table>
        <thead>
          <tr>
            <th>{"Service"}</th>
            <th>{"Source / origin"}</th>
            <th>{"Destination / use"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"IEC 61850 MMS"}</td>
            <td>{"IED reports and available controls"}</td>
            <td>{"SCADA server / station gateway"}</td>
          </tr>
          <tr>
            <td>{"IEC 61850 GOOSE"}</td>
            <td>{"Configured IED publisher"}</td>
            <td>{"Configured peer subscribers"}</td>
          </tr>
          <tr>
            <td>{"Modbus TCP"}</td>
            <td>{"Meter / lab server"}</td>
            <td>{"Polling client or gateway in the lab"}</td>
          </tr>
          <tr>
            <td>{"IEC 60870‑5‑104"}</td>
            <td>{"Station gateway"}</td>
            <td>{"RCC telecontrol interface"}</td>
          </tr>
          <tr>
            <td>{"PTP / SNTP"}</td>
            <td>{"Configured station time services"}</td>
            <td>{"IED and server time synchronization"}</td>
          </tr>
        </tbody>
      </table>
      <svg viewBox={"0 0 1110 130"} role={"img"} aria-label={"Time synchronization overview"}>
        <text x={"25"} y={"29"} className={"strong"}>{"01  TIME DISTRIBUTION"}</text>
        <rect x={"25.0"} y={"52"} width={"316.3333333333333"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"183.16666666666666"} y={"76.0"} className={"center strong"}>{"CLK‑PTP‑GM"}</text>
        <text x={"183.16666666666666"} y={"95.0"} className={"center small"}>{"Station time source"}</text>
        <path d={"M341.3333333333333 79h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"378.3333333333333"} y={"52"} width={"316.3333333333333"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"536.5"} y={"76.0"} className={"center strong"}>{"Station network"}</text>
        <text x={"536.5"} y={"95.0"} className={"center small"}>{"Model timing interfaces"}</text>
        <path d={"M694.6666666666666 79h37m-7 -4l7 4 -7 4"} className={"wire"} />
        <rect x={"731.6666666666666"} y={"52"} width={"316.3333333333333"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"889.8333333333333"} y={"76.0"} className={"center strong"}>{"IEDs and servers"}</text>
        <text x={"889.8333333333333"} y={"95.0"} className={"center small"}>{"Event time reference"}</text>
      </svg>
    </>,
  },
  {
    number: "SAS‑02",
    title: "Breaker position signal trace",
    scope: "33‑F03 • field indication to HMI and RCC",
    reading: "Start with 52a/52b, then follow the IED data object to the SCADA tag or the gateway mapping. The three rows give the model’s default indication, measurement and command address examples for this bay.",
    content: <>
      <svg viewBox={"0 0 1110 349"} role={"img"} aria-label={"Breaker feedback signal paths"}>
        <text x={"24"} y={"57"} className={"strong"}>{"Station path · IEC 61850 MMS"}</text>
        <rect x={"24"} y={"82"} width={"315"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"181.5"} y={"106.0"} className={"center strong"}>{"52a / 52b"}</text>
        <text x={"181.5"} y={"125.0"} className={"center small"}>{"Breaker auxiliary contacts"}</text>
        <path d={"M339 107h56"} className={"lan-a"} />
        <rect x={"395"} y={"82"} width={"315"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"552.5"} y={"106.0"} className={"center strong"}>{"IED‑33‑F03"}</text>
        <text x={"552.5"} y={"125.0"} className={"center small"}>{"XCBR1.Pos.stVal / q / t"}</text>
        <path d={"M710 107h56"} className={"lan-a"} />
        <rect x={"766"} y={"82"} width={"315"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"923.5"} y={"106.0"} className={"center strong"}>{"Station SCADA"}</text>
        <text x={"923.5"} y={"125.0"} className={"center small"}>{"SAS_33_F03_CB.POS_DP"}</text>
        <text x={"24"} y={"193"} className={"strong"}>{"RCC path · IEC 61850 MMS → IEC‑104"}</text>
        <rect x={"24"} y={"218"} width={"315"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"181.5"} y={"242.0"} className={"center strong"}>{"IED‑33‑F03"}</text>
        <text x={"181.5"} y={"261.0"} className={"center small"}>{"Breaker position"}</text>
        <path d={"M339 243h56"} className={"lan-b"} />
        <rect x={"395"} y={"218"} width={"315"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"552.5"} y={"242.0"} className={"center strong"}>{"GTW‑RCC‑01"}</text>
        <text x={"552.5"} y={"261.0"} className={"center small"}>{"IEC‑104 Type 31"}</text>
        <path d={"M710 243h56"} className={"lan-b"} />
        <rect x={"766"} y={"218"} width={"315"} height={"54"} rx={"2"} className={"plate"} />
        <text x={"923.5"} y={"242.0"} className={"center strong"}>{"RCC"}</text>
        <text x={"923.5"} y={"261.0"} className={"center small"}>{"COA 132 · IOA 1011*"}</text>
        <text x={"24"} y={"329"} className={"small"}>{"* IOA shown for the default model bay order. Verify the registry entry for a changed configuration."}</text>
      </svg>
      <table>
        <thead>
          <tr>
            <th>{"Model CA / IOA"}</th>
            <th>{"IEC‑104 type"}</th>
            <th>{"Signal"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"132 / 1011"}</td>
            <td>{"31 (M_DP_TB_1)"}</td>
            <td>{"Circuit Breaker Position (52a/52b)"}</td>
          </tr>
          <tr>
            <td>{"132 / 3011"}</td>
            <td>{"36 (M_ME_TF_1)"}</td>
            <td>{"Three-Phase Active Power (MW)"}</td>
          </tr>
          <tr>
            <td>{"132 / 6011"}</td>
            <td>{"46 (C_DC_NA_1)"}</td>
            <td>{"Remote RCC Breaker Trip/Close Command"}</td>
          </tr>
        </tbody>
      </table>
    </>,
  },
  {
    number: "R‑01",
    title: "Inputs for an approved issue",
    scope: "Drawing register • items pending project verification",
    reading: "Before an approved issue, correlate each sheet with the listed inputs. This set uses simulator identifiers and training diagrams. The approval record and field design details remain pending.",
    content: <>
      <table>
        <thead>
          <tr>
            <th>{"Input"}</th>
            <th>{"Needed for"}</th>
            <th>{"Status"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"Utility-approved primary SLD and GA"}</td>
            <td>{"Actual arrangement, equipment locations and nomenclature"}</td>
            <td>{"Required"}</td>
          </tr>
          <tr>
            <td>{"Breaker and relay vendor drawings"}</td>
            <td>{"Connector pins, auxiliary supply, coils and supervision"}</td>
            <td>{"Required"}</td>
          </tr>
          <tr>
            <td>{"CT / VT datasheets and secondary schematics"}</td>
            <td>{"Core/class allocation, test links and polarity"}</td>
            <td>{"Required"}</td>
          </tr>
          <tr>
            <td>{"Panel terminal and cable schedule"}</td>
            <td>{"Panel terminals, marshalling, cable cores and shields"}</td>
            <td>{"Required"}</td>
          </tr>
          <tr>
            <td>{"Interlocking and protection design"}</td>
            <td>{"Permissive matrix, intertrip conditions and settings"}</td>
            <td>{"Required"}</td>
          </tr>
          <tr>
            <td>{"Approved SAS configuration and addressing"}</td>
            <td>{"SCD, switch ports, IP/VLAN plans and final RCC point list"}</td>
            <td>{"Required"}</td>
          </tr>
          <tr>
            <td>{"Project checking and approval record"}</td>
            <td>{"Originator, checker, approver and issue authorization"}</td>
            <td>{"Required"}</td>
          </tr>
        </tbody>
      </table>
    </>,
  },
];

export function SchemeDrawingSheets() {
  const [sheetIndex, setSheetIndex] = useState(0);
  const sheet = sheets[sheetIndex];
  const heading = useRef<HTMLHeadingElement>(null);

  return <section className="scheme-drawing-set" aria-label="Engineering drawing set">
    <div className="scheme-section-head">
      <div>
        <h2>Project drawings</h2>
        <p>{sheets.length} sheets · Revision P1 · Illustrative training issue</p>
      </div>
      <a className="scheme-download" href={`${import.meta.env.BASE_URL}scheme/SAS-Project-Drawing-Set.pdf`} download>
        <Download size={16} aria-hidden="true" /> Download drawing set PDF
      </a>
    </div>
    <div className="scheme-sheet-controls">
      <div className="scheme-sheet-selector">
        <label htmlFor="scheme-sheet-select">Drawing</label>
        <select id="scheme-sheet-select" value={sheetIndex} onChange={event => setSheetIndex(Number(event.target.value))}>
          {sheets.map((item, i) => <option key={item.number} value={i}>{item.number} · {item.title}</option>)}
        </select>
      </div>
      <div>
        <button type="button" onClick={() => setSheetIndex(0)} disabled={sheetIndex === 0}>Drawing index</button>
        <button type="button" onClick={() => setSheetIndex(sheetIndex - 1)} disabled={sheetIndex === 0}><ArrowLeft size={16} aria-hidden="true" />Previous</button>
        <button type="button" onClick={() => setSheetIndex(sheetIndex + 1)} disabled={sheetIndex === sheets.length - 1}>Next<ArrowRight size={16} aria-hidden="true" /></button>
      </div>
    </div>
    <article className="scheme-drawing-sheet" aria-labelledby="scheme-sheet-title">
      <header>
        <span className="scheme-sheet-number">{sheet.number}</span>
        <div>
          <h3 id="scheme-sheet-title" ref={heading} tabIndex={-1} aria-live="polite">{sheet.title}</h3>
          <p>{sheet.scope}</p>
        </div>
      </header>
      <div key={sheet.number} className="scheme-sheet-figure" tabIndex={0} aria-label={`${sheet.title} drawing content`}>
        {sheet.content}
        {sheetIndex === 0 && <table>
          <thead><tr><th scope="col">Drawing</th><th scope="col">Title</th><th scope="col">Scope</th></tr></thead>
          <tbody>{sheets.slice(1).map((item, i) => <tr key={item.number}>
            <td><button type="button" onClick={() => { setSheetIndex(i + 1); heading.current?.focus(); }} aria-label={`Open ${item.number} ${item.title}`}>{item.number}</button></td>
            <td>{item.title}</td><td>{item.scope}</td>
          </tr>)}</tbody>
        </table>}
      </div>
      <div className="scheme-sheet-reading"><strong>How to read</strong> {sheet.reading}</div>
      <footer className="scheme-sheet-titleblock">
        <div><small>Project</small><b>132/33/11 kV SAS Engineering Hub</b></div>
        <div><small>Issue status</small><b>Training issue · Illustrative model</b></div>
        <div><small>Drawing / revision · {sheetIndex + 1}/{sheets.length}</small><b>{sheet.number} / P1</b></div>
      </footer>
    </article>
  </section>;
}
