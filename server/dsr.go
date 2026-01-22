package server

import "strconv"

type dsrState uint8

const (
	dsrStateGround dsrState = iota
	dsrStateEsc
	dsrStateCsi
)

const dsrMaxParams = 8

type dsrRequest struct {
	index   int
	private bool
}

type dsrScanner struct {
	state           dsrState
	params          []byte
	hasIntermediate bool
}

func newDSRScanner() *dsrScanner {
	return &dsrScanner{
		state:  dsrStateGround,
		params: make([]byte, 0, dsrMaxParams),
	}
}

func (d *dsrScanner) resetCSI() {
	d.params = d.params[:0]
	d.hasIntermediate = false
}

func (d *dsrScanner) scan(data []byte) []dsrRequest {
	if d == nil {
		return nil
	}
	var reqs []dsrRequest
	for i, b := range data {
		switch d.state {
		case dsrStateGround:
			if b == 0x1b {
				d.state = dsrStateEsc
			}
		case dsrStateEsc:
			if b == '[' {
				d.state = dsrStateCsi
				d.resetCSI()
			} else if b != 0x1b {
				d.state = dsrStateGround
			}
		case dsrStateCsi:
			switch {
			case b >= 0x40 && b <= 0x7e:
				if b == 'n' && !d.hasIntermediate {
					if len(d.params) == 1 && d.params[0] == '6' {
						reqs = append(reqs, dsrRequest{index: i, private: false})
					} else if len(d.params) == 2 && d.params[0] == '?' && d.params[1] == '6' {
						reqs = append(reqs, dsrRequest{index: i, private: true})
					}
				}
				d.state = dsrStateGround
			case b >= 0x30 && b <= 0x3f:
				if len(d.params) < dsrMaxParams {
					d.params = append(d.params, b)
				} else {
					d.hasIntermediate = true
				}
			case b >= 0x20 && b <= 0x2f:
				d.hasIntermediate = true
			case b == 0x1b:
				d.state = dsrStateEsc
			default:
				d.state = dsrStateGround
			}
		}
	}
	return reqs
}

func buildCPRReply(snap *Snapshot, private bool) []byte {
	row := snap.CursorY + 1
	col := snap.CursorX + 1
	if row < 1 {
		row = 1
	}
	if col < 1 {
		col = 1
	}
	buf := make([]byte, 0, 16)
	buf = append(buf, 0x1b, '[')
	if private {
		buf = append(buf, '?')
	}
	buf = strconv.AppendInt(buf, int64(row), 10)
	buf = append(buf, ';')
	buf = strconv.AppendInt(buf, int64(col), 10)
	buf = append(buf, 'R')
	return buf
}
